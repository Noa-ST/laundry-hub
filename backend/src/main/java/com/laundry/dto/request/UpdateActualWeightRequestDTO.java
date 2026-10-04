package com.laundry.dto.request;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record UpdateActualWeightRequestDTO(
    @NotNull @Positive Double actualWeight
) {}
