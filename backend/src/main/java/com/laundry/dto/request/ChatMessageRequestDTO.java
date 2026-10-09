package com.laundry.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChatMessageRequestDTO {
    @NotBlank(message = "Nội dung không được để trống")
    private String content;
}
