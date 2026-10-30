package com.blooddonation.tracking;

import java.util.LinkedHashMap;
import java.util.Map;

/** A blood donation center exposed by the tracking API. */
public final class BloodCenter {
  private final long id;
  private final String name;
  private final String city;
  private final String address;
  private final String contact;
  private final Double latitude;
  private final Double longitude;
  private final String status;
  private final String operatingHours;
  private final String lastUpdated;
  private final String createdAt;

  public BloodCenter(
      long id,
      String name,
      String city,
      String address,
      String contact,
      Double latitude,
      Double longitude,
      String status,
      String operatingHours,
      String lastUpdated,
      String createdAt) {
    this.id = id;
    this.name = name;
    this.city = city;
    this.address = address;
    this.contact = contact;
    this.latitude = latitude;
    this.longitude = longitude;
    this.status = status;
    this.operatingHours = operatingHours;
    this.lastUpdated = lastUpdated;
    this.createdAt = createdAt;
  }

  public long getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public String getCity() {
    return city;
  }

  public String getLastUpdated() {
    return lastUpdated;
  }

  public Map<String, Object> toJson() {
    Map<String, Object> json = new LinkedHashMap<String, Object>();
    json.put("id", id);
    json.put("name", name);
    json.put("city", city);
    json.put("address", address);
    json.put("contact", contact);
    json.put("latitude", latitude);
    json.put("longitude", longitude);
    json.put("status", status);
    json.put("operating_hours", operatingHours);
    json.put("last_updated", lastUpdated);
    json.put("created_at", createdAt);
    return json;
  }

  public static BloodCenter fromJson(Map<String, Object> json) {
    return new BloodCenter(
        Json.getLong(json, "id", 0),
        Json.getString(json, "name"),
        Json.getString(json, "city"),
        Json.getString(json, "address"),
        Json.getString(json, "contact"),
        Json.getDouble(json, "latitude"),
        Json.getDouble(json, "longitude"),
        Json.getString(json, "status"),
        Json.getString(json, "operating_hours"),
        Json.getString(json, "last_updated"),
        Json.getString(json, "created_at"));
  }
}
