package com.laundry.service;

import com.laundry.entity.Order;
import com.laundry.enums.InboundType;
import com.laundry.enums.OrderStatus;
import com.laundry.enums.OutboundType;
import com.laundry.exception.BadRequestException;
import org.springframework.stereotype.Service;
import java.time.Instant;

@Service
public class OrderStateMachineService {

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
                    if (cancelReason == null || cancelReason.trim().isEmpty()) {
                        throw new BadRequestException("Phải nhập lý do hủy đơn.");
                    }
                    if (cancelledBy == null) {
                        throw new BadRequestException("Thiếu thông tin người hủy đơn.");
                    }
                    order.setCancelReason(cancelReason);
                    order.setCancelledBy(cancelledBy);
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
                } else {
                    throw new BadRequestException("Chuyển trạng thái không hợp lệ từ CONFIRMED.");
                }
                break;

            case PICKING_UP:
                if (nextStatus == OrderStatus.RECEIVED) {
                    // Valid
                } else {
                    throw new BadRequestException("Từ PICKING_UP chỉ có thể chuyển sang RECEIVED.");
                }
                break;

            case RECEIVED:
                if (nextStatus == OrderStatus.PROCESSING) {
                    // Valid
                } else if (nextStatus == OrderStatus.CANCELLED) {
                    if (cancelReason == null || cancelReason.trim().isEmpty()) {
                        throw new BadRequestException("Phải nhập lý do hủy đơn.");
                    }
                    order.setCancelReason(cancelReason);
                    order.setCancelledBy("SHOP_OWNER"); // Khách hàng không thể hủy từ bước CONFIRMED trở đi
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
                    order.setPaymentStatus(com.laundry.enums.PaymentStatus.PAID);
                    order.setPaidAt(Instant.now());
                } else {
                    throw new BadRequestException("Chuyển trạng thái không hợp lệ từ READY.");
                }
                break;

            case DELIVERING:
                if (nextStatus == OrderStatus.COMPLETED) {
                    order.setPaymentStatus(com.laundry.enums.PaymentStatus.PAID);
                    order.setPaidAt(Instant.now());
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
}
