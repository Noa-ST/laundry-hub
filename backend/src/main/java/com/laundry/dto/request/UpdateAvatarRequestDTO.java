package com.laundry.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UpdateAvatarRequestDTO {
    @NotBlank(message = "Avatar URL không được để trống")
    @Pattern(regexp = "^https://res\\.cloudinary\\.com/.*", message = "Ảnh đại diện phải thuộc máy chủ Cloudinary hợp lệ (https://res.cloudinary.com/...)")
    private String avatarUrl;
}

