package com.jmportfolio.jm.domains.users.client.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateUserProfileDto {
    private String email;
    private String avatarUrl;
    private String currentPassword;
    private String newPassword;
}
