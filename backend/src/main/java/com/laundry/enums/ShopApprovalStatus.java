package com.laundry.enums;

public enum ShopApprovalStatus {
    PENDING_APPROVAL("Chờ phê duyệt"),
    APPROVED("Đã phê duyệt"),
    REJECTED("Bị từ chối");

    private final String label;

    ShopApprovalStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
