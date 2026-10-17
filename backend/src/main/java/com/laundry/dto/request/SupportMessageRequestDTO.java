package com.laundry.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SupportMessageRequestDTO {
    @NotBlank(message = "Nội dung tin nhắn không được để trống")
    private String content;
}
