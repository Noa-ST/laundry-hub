package com.laundry.auth.dto;

import com.laundry.entity.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RegisterRequestDTO {
    @NotBlank(message = "Tên không được để trống")
    private String fullName;
    
    @NotBlank(message = "Số điện thoại không được để trống")
    private String phone;
    
    @NotBlank(message = "Mật khẩu không được để trống")
    private String password;
    
    @NotNull(message = "Vai trò không được để trống")
    private Role role;
}