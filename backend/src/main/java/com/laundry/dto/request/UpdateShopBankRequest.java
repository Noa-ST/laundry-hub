package com.laundry.dto.request;

import lombok.Data;

@Data
public class UpdateShopBankRequest {
    private String bankName;
    private String bankAccountNumber;
    private String bankAccountName;
}
