package com.jmportfolio.jm.domains.auth.client.dto;

import java.util.Objects;

import com.google.gson.annotations.SerializedName;

public class LoginInternalResponse {
  public static final String SERIALIZED_NAME_ACCESS_TOKEN = "accessToken";
  @SerializedName(SERIALIZED_NAME_ACCESS_TOKEN)
  @jakarta.annotation.Nullable
  private String accessToken;

  public static final String SERIALIZED_NAME_REFRESH_TOKEN = "refreshToken";
  @SerializedName(SERIALIZED_NAME_REFRESH_TOKEN)
  @jakarta.annotation.Nullable
  private String refreshToken;

  public LoginInternalResponse() {
  }

  /**
   * Constructor with all args parameters
   */
  public LoginInternalResponse( String accessToken,  String refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  public LoginInternalResponse accessToken(@jakarta.annotation.Nullable String accessToken) {
    
    this.accessToken = accessToken;
    return this;
  }

  /**
   * Get accessToken
   * @return accessToken
   */
  @jakarta.annotation.Nullable

  public String getAccessToken() {
    return accessToken;
  }


  public void setAccessToken(@jakarta.annotation.Nullable String accessToken) {
    this.accessToken = accessToken;
  }

  public LoginInternalResponse refreshToken(@jakarta.annotation.Nullable String refreshToken) {
    
    this.refreshToken = refreshToken;
    return this;
  }

  /**
   * Get refreshToken
   * @return refreshToken
   */
  @jakarta.annotation.Nullable

  public String getRefreshToken() {
    return refreshToken;
  }


  public void setRefreshToken(@jakarta.annotation.Nullable String refreshToken) {
    this.refreshToken = refreshToken;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    LoginInternalResponse loginInternalResponse = (LoginInternalResponse) o;
    return Objects.equals(this.accessToken, loginInternalResponse.accessToken) &&
        Objects.equals(this.refreshToken, loginInternalResponse.refreshToken);
  }

  @Override
  public int hashCode() {
    return Objects.hash(accessToken, refreshToken);
  }

  @Override
  public String toString() {
    StringBuilder sb = new StringBuilder();
    sb.append("class LoginInternalResponse {\n");
    sb.append("    accessToken: ").append(toIndentedString(accessToken)).append("\n");
    sb.append("    refreshToken: ").append(toIndentedString(refreshToken)).append("\n");
    sb.append("}");
    return sb.toString();
  }

  /**
   * Convert the given object to string with each line indented by 4 spaces
   * (except the first line).
   */
  private String toIndentedString(Object o) {
    if (o == null) {
      return "null";
    }
    return o.toString().replace("\n", "\n    ");
  }

}

