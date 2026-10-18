package com.laundry.service;

import com.laundry.entity.Order;
import com.laundry.enums.InboundType;
import com.laundry.enums.OrderStatus;
import com.laundry.enums.OutboundType;
import com.laundry.enums.PaymentMethod;
import com.laundry.enums.PaymentStatus;
import com.laundry.exception.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class OrderStateMachineServiceTest {

    private OrderStateMachineService stateMachine;
    private Order order;

    @BeforeEach
    void setUp() {
        stateMachine = new OrderStateMachineService();
        order = new Order();
        order.setStatus(OrderStatus.PENDING);
        order.setPaymentStatus(PaymentStatus.PENDING);
        order.setPaymentMethod(PaymentMethod.COD);
    }

    @Test
    @DisplayName("Chuyển từ PENDING sang CONFIRMED thành công")
    void shouldTransitionFromPendingToConfirmed() {
        stateMachine.transitionTo(order, OrderStatus.CONFIRMED, null, null);
        assertEquals(OrderStatus.CONFIRMED, order.getStatus());
    }

    @Test
    @DisplayName("Hủy đơn từ PENDING cần có lý do")
    void shouldFailCancellationWithoutReason() {
        assertThrows(BadRequestException.class, () ->
                stateMachine.transitionTo(order, OrderStatus.CANCELLED, "", OrderStateMachineService.CANCELLED_BY_CUSTOMER)
        );
    }

    @Test
    @DisplayName("Hủy đơn từ PENDING thành công khi có lý do")
    void shouldCancelPendingOrderWithReason() {
        stateMachine.transitionTo(order, OrderStatus.CANCELLED, "Thay đổi kế hoạch", OrderStateMachineService.CANCELLED_BY_CUSTOMER);
        assertEquals(OrderStatus.CANCELLED, order.getStatus());
        assertEquals("Thay đổi kế hoạch", order.getCancelReason());
        assertEquals(OrderStateMachineService.CANCELLED_BY_CUSTOMER, order.getCancelledBy());
    }

    @Test
    @DisplayName("Không được nhảy cóc từ PENDING sang PROCESSING")
    void shouldRejectInvalidJumpFromPending() {
        assertThrows(BadRequestException.class, () ->
                stateMachine.transitionTo(order, OrderStatus.PROCESSING, null, null)
        );
    }

    @Test
    @DisplayName("Từ CONFIRMED sang PICKING_UP hợp lệ khi inbound là SHOP_PICK_UP")
    void shouldTransitionToPickingUpWhenShopPickUp() {
        order.setStatus(OrderStatus.CONFIRMED);
        order.setInboundType(InboundType.SHOP_PICK_UP);

        stateMachine.transitionTo(order, OrderStatus.PICKING_UP, null, null);
        assertEquals(OrderStatus.PICKING_UP, order.getStatus());
    }

    @Test
    @DisplayName("Từ CONFIRMED sang PICKING_UP lỗi nếu khách tự mang đến (CUSTOMER_DROP_OFF)")
    void shouldRejectPickingUpWhenCustomerDropOff() {
        order.setStatus(OrderStatus.CONFIRMED);
        order.setInboundType(InboundType.CUSTOMER_DROP_OFF);

        assertThrows(BadRequestException.class, () ->
                stateMachine.transitionTo(order, OrderStatus.PICKING_UP, null, null)
        );
    }

    @Test
    @DisplayName("Từ READY sang DELIVERING hợp lệ khi outbound là SHOP_DELIVERY")
    void shouldTransitionToDeliveringWhenShopDelivery() {
        order.setStatus(OrderStatus.READY);
        order.setOutboundType(OutboundType.SHOP_DELIVERY);

        stateMachine.transitionTo(order, OrderStatus.DELIVERING, null, null);
        assertEquals(OrderStatus.DELIVERING, order.getStatus());
    }

    @Test
    @DisplayName("Hoàn thành đơn chưa thanh toán nhưng chọn VIETQR phải chuyển về COD để chống gian lận payout")
    void shouldConvertUnpaidVietQrToCodOnCompletion() {
        order.setStatus(OrderStatus.DELIVERING);
        order.setOutboundType(OutboundType.SHOP_DELIVERY);
        order.setPaymentMethod(PaymentMethod.VIETQR);
        order.setPaymentStatus(PaymentStatus.PENDING);

        stateMachine.transitionTo(order, OrderStatus.COMPLETED, null, null);

        assertEquals(OrderStatus.COMPLETED, order.getStatus());
        assertEquals(PaymentMethod.COD, order.getPaymentMethod(), "Chưa thanh toán qua cổng thì chuyển thành COD khi thu tiền mặt");
        assertEquals(PaymentStatus.PAID, order.getPaymentStatus());
        assertNotNull(order.getPaidAt());
    }

    @Test
    @DisplayName("Đơn đã thanh toán online qua cổng (PAID) thì giữ nguyên phương thức khi hoàn thành")
    void shouldKeepPaidVietQrOnCompletion() {
        order.setStatus(OrderStatus.DELIVERING);
        order.setOutboundType(OutboundType.SHOP_DELIVERY);
        order.setPaymentMethod(PaymentMethod.VIETQR);
        order.setPaymentStatus(PaymentStatus.PAID);

        stateMachine.transitionTo(order, OrderStatus.COMPLETED, null, null);

        assertEquals(OrderStatus.COMPLETED, order.getStatus());
        assertEquals(PaymentMethod.VIETQR, order.getPaymentMethod());
        assertEquals(PaymentStatus.PAID, order.getPaymentStatus());
    }

    @Test
    @DisplayName("Không được thay đổi trạng thái của đơn đã COMPLETED hoặc CANCELLED")
    void shouldRejectChangesToClosedOrders() {
        order.setStatus(OrderStatus.COMPLETED);
        assertThrows(BadRequestException.class, () ->
                stateMachine.transitionTo(order, OrderStatus.PROCESSING, null, null)
        );

        order.setStatus(OrderStatus.CANCELLED);
        assertThrows(BadRequestException.class, () ->
                stateMachine.transitionTo(order, OrderStatus.PENDING, null, null)
        );
    }
}
