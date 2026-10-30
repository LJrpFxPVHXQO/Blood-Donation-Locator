package com.blooddonation.tracking;

import java.util.LinkedHashMap;
import java.util.Map;

/** Stock for one blood type at one blood center. */
public final class BloodInventory {
  private final long centerId;
  private final String bloodType;
  private int unitsAvailable;
  private int unitsReserved;
  private int criticalThreshold;
  private String lastUpdated;

  public BloodInventory(
      long centerId,
      String bloodType,
      int unitsAvailable,
      int unitsReserved,
      int criticalThreshold,
      String lastUpdated) {
    this.centerId = centerId;
    this.bloodType = bloodType;
    this.unitsAvailable = unitsAvailable;
    this.unitsReserved = unitsReserved;
    this.criticalThreshold = criticalThreshold;
    this.lastUpdated = lastUpdated;
  }

  public long getCenterId() {
    return centerId;
  }

  public String getBloodType() {
    return bloodType;
  }

  public String getLastUpdated() {
    return lastUpdated;
  }

  public void update(int unitsAvailable, int unitsReserved, int criticalThreshold, String lastUpdated) {
    this.unitsAvailable = unitsAvailable;
    this.unitsReserved = unitsReserved;
    this.criticalThreshold = criticalThreshold;
    this.lastUpdated = lastUpdated;
  }

  public Map<String, Object> toJson() {
    Map<String, Object> json = new LinkedHashMap<String, Object>();
    json.put("center_id", centerId);
    json.put("blood_type", bloodType);
    json.put("units_available", unitsAvailable);
    json.put("units_reserved", unitsReserved);
    json.put("critical_threshold", criticalThreshold);
    json.put("last_updated", lastUpdated);
    return json;
  }

  public static BloodInventory fromJson(Map<String, Object> json) {
    return new BloodInventory(
        Json.getLong(json, "center_id", 0),
        Json.getString(json, "blood_type"),
        Json.getInt(json, "units_available", 0),
        Json.getInt(json, "units_reserved", 0),
        Json.getInt(json, "critical_threshold", 5),
        Json.getString(json, "last_updated"));
  }
}
