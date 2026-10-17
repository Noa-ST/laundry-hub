package com.laundry.service;

import com.laundry.entity.Order;
import com.laundry.enums.InboundType;
import com.laundry.enums.OrderStatus;
import com.laundry.enums.OutboundType;
import com.laundry.enums.PaymentMethod;
import com.laundry.enums.PaymentStatus;
import com.laundry.exception.BadRequestException;
import org.springframework.stereotype.Service;
import java.time.Instant;

@Service
public class OrderStateMachineService {

    public static final String CANCELLED_BY_CUSTOMER = "CUSTOMER";
    public static final String CANCELLED_BY_SHOP_OWNER = "SHOP_OWNER";

    public void transitionTo(Order order, OrderStatus nextStatus, String cancelReason, String cancelledBy) {
        OrderStatus current = order.getStatus();

        if (current == nextStatus) {
            return;
        }

        switch (current) {
            case PENDING:
                if (nextStatus == OrderStatus.CONFIRMED) {
                    // Valid
                } else if (nextStatus == OrderStatus.CANCELLED) {
                    applyCancellation(order, cancelReason, cancelledBy);
                } else {
                    throw new BadRequestException("Từ PENDING chỉ có thể chuyển sang CONFIRMED hoặc CANCELLED.");
                }
                break;

            case CONFIRMED:
                if (nextStatus == OrderStatus.PICKING_UP) {
                    if (order.getInboundType() != InboundType.SHOP_PICK_UP) {
                        throw new BadRequestException("Đơn hàng này không yêu cầu tiệm đi lấy.");
                    }
                } else if (nextStatus == OrderStatus.RECEIVED) {
                    if (order.getInboundType() != InboundType.CUSTOMER_DROP_OFF) {
                        throw new BadRequestException("Đơn hàng này yêu cầu tiệm đi lấy, không thể nhảy cóc sang RECEIVED.");
                    }
                } else if (nextStatus == OrderStatus.CANCELLED) {
                    // Khách đổi ý / không liên lạc được sau khi tiệm đã nhận đơn
                    requireShopOwnerCancellation(cancelledBy);
                    applyCancellation(order, cancelReason, cancelledBy);
                } else {
                    throw new BadRequestException("Chuyển trạng thái không hợp lệ từ CONFIRMED.");
                }
                break;

            case PICKING_UP:
                if (nextStatus == OrderStatus.RECEIVED) {
                    // Valid
                } else if (nextStatus == OrderStatus.CANCELLED) {
                    // Đến nơi nhưng không lấy được đồ (khách vắng nhà, khách hủy...)
                    requireShopOwnerCancellation(cancelledBy);
                    applyCancellation(order, cancelReason, cancelledBy);
                } else {
                    throw new BadRequestException("Từ PICKING_UP chỉ có thể chuyển sang RECEIVED hoặc CANCELLED.");
                }
                break;

            case RECEIVED:
                if (nextStatus == OrderStatus.PROCESSING) {
                    // Valid
                } else if (nextStatus == OrderStatus.CANCELLED) {
                    // Khách hàng không thể hủy từ bước CONFIRMED trở đi
                    requireShopOwnerCancellation(cancelledBy);
                    applyCancellation(order, cancelReason, cancelledBy);
                } else {
                    throw new BadRequestException("Từ RECEIVED chỉ có thể chuyển sang PROCESSING hoặc CANCELLED.");
                }
                break;

            case PROCESSING:
                if (nextStatus == OrderStatus.READY) {
                    // Valid
                } else {
                    throw new BadRequestException("Từ PROCESSING chỉ có thể chuyển sang READY.");
                }
                break;

            case READY:
                if (nextStatus == OrderStatus.DELIVERING) {
                    if (order.getOutboundType() != OutboundType.SHOP_DELIVERY) {
                        throw new BadRequestException("Đơn hàng này không yêu cầu tiệm đi giao.");
                    }
                } else if (nextStatus == OrderStatus.COMPLETED) {
                    if (order.getOutboundType() != OutboundType.CUSTOMER_PICK_UP) {
                        throw new BadRequestException("Đơn hàng này yêu cầu tiệm đi giao, không thể nhảy cóc sang COMPLETED.");
                    }
                    settlePaymentOnCompletion(order);
                } else {
                    throw new BadRequestException("Chuyển trạng thái không hợp lệ từ READY.");
                }
                break;

            case DELIVERING:
                if (nextStatus == OrderStatus.COMPLETED) {
                    settlePaymentOnCompletion(order);
                } else {
                    throw new BadRequestException("Từ DELIVERING chỉ có thể chuyển sang COMPLETED.");
                }
                break;

            case COMPLETED:
            case CANCELLED:
                throw new BadRequestException("Không thể thay đổi trạng thái của đơn hàng đã đóng.");

            default:
                throw new BadRequestException("Trạng thái hiện tại không hợp lệ.");
        }

        order.setStatus(nextStatus);
    }

    private void applyCancellation(Order order, String cancelReason, String cancelledBy) {
        if (cancelReason == null || cancelReason.trim().isEmpty()) {
            throw new BadRequestException("Phải nhập lý do hủy đơn.");
        }
        if (cancelledBy == null || cancelledBy.isBlank()) {
            throw new BadRequestException("Thiếu thông tin người hủy đơn.");
        }
        order.setCancelReason(cancelReason.trim());
        order.setCancelledBy(cancelledBy);
    }

    private void requireShopOwnerCancellation(String cancelledBy) {
        if (!CANCELLED_BY_SHOP_OWNER.equals(cancelledBy)) {
            throw new BadRequestException("Đơn hàng đã được tiệm tiếp nhận, chỉ tiệm mới có thể hủy đơn. Vui lòng liên hệ tiệm.");
        }
    }

    /**
     * Chốt thanh toán khi đơn hoàn thành.
     *
     * - Đơn đã PAID (qua webhook PayOS, hoặc POS thu trước): giữ nguyên, không ghi đè paidAt gốc.
     * - Đơn chưa PAID: tiệm thu tiền trực tiếp khi trao đồ ("Thu tiền"). Số tiền này nằm ở tiệm,
     *   KHÔNG đi qua tài khoản Sàn, nên nếu khách từng chọn VIETQR thì phải ghi nhận lại là COD.
     *   Nếu không, đơn sẽ thành "VIETQR + PAID" và lọt vào kỳ đối soát -> Sàn chi trả số tiền
     *   mà Sàn chưa hề nhận được.
     */
    private void settlePaymentOnCompletion(Order order) {
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            return;
        }
        if (order.getPaymentMethod() == PaymentMethod.VIETQR) {
            order.setPaymentMethod(PaymentMethod.COD);
        }
        order.setPaymentStatus(PaymentStatus.PAID);
        order.setPaidAt(Instant.now());
    }
}
