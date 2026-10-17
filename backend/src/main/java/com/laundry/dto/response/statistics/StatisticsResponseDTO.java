package com.laundry.dto.response.statistics;

import java.util.List;

public record StatisticsResponseDTO(
    KpiCardsDTO kpis,
    List<RevenuePointDTO> revenueTrend,
    List<TopServiceDTO> topServices,
    List<CategoryRevenueDTO> categoryRevenue,
    OperationalBreakdownDTO operationalBreakdown
) {
    public record KpiCardsDTO(
        double netRevenue,
        double revenueChangePercent,
        int orderVolume,
        int cancelCount,
        double cancelRate,
        double averageOrderValue,
        double totalVolumeKg,
        int totalVolumeItems
    ) {}

    public record RevenuePointDTO(
        String label,
        double revenue,
        int orderCount
    ) {}

    public record TopServiceDTO(
        String serviceName,
        double revenue,
        int totalQuantity
    ) {}

    public record CategoryRevenueDTO(
        String categoryName,
        double revenue
    ) {}

    public record OperationalBreakdownDTO(
        ChannelBreakdown channel,
        DeliveryBreakdown delivery,
        PaymentBreakdown payment
    ) {
        public record ChannelBreakdown(int app, int pos) {}
        public record DeliveryBreakdown(int customerDropOff, int shopPickUp, int customerPickUp, int shopDelivery) {}
        public record PaymentBreakdown(int cash, int vietQr, double cashRevenue, double vietQrRevenue) {}
    }
}
