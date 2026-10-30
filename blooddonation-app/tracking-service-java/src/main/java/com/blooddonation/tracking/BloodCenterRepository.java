package com.blooddonation.tracking;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Stores blood center and inventory data in a JSON file. The data survives restarts and is seeded
 * with the same sample centers that the application previously kept in SQLite.
 */
public final class BloodCenterRepository {
  private static final List<String> BLOOD_TYPES = Arrays.asList(
      "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-");

  private static final String[][] DEFAULT_CENTERS = {
      {"East Avenue Medical Center Blood Bank", "Quezon City",
          "East Avenue, Diliman, Quezon City", "+63 2 928-0611"},
      {"National Kidney and Transplant Institute Blood Bank", "Quezon City",
          "East Avenue, Quezon City", "+63 2 8981-0300"},
      {"Philippine General Hospital Blood Bank", "Manila",
          "Taft Avenue, Ermita, Manila", "+63 2 8554-8400"},
      {"Manila Doctors Hospital Blood Bank", "Manila",
          "667 United Nations Ave, Ermita, Manila", "+63 2 558-0888"},
      {"Caloocan City Medical Center Blood Bank", "Caloocan City",
          "Caloocan City", "+63 2 961-4971"},
      {"Makati Medical Center Blood Bank", "Makati",
          "2 Amorsolo St, Legazpi Village, Makati", "+63 2 8888-8999"},
      {"San Juan De Dios Hospital Blood Bank", "Pasay City",
          "2772 Roxas Blvd, Pasay City", "+63 2 831-9731"},
      {"Rizal Medical Center Blood Bank", "Rizal Main",
          "Pasig Boulevard, Pasig City", "+63 2 8651-7800"},
      {"Ospital ng Muntinlupa Blood Bank", "Muntinlupa",
          "Katarungan St, Poblacion, Muntinlupa", "+63 2 8626-3931"},
  };

  private final Path dataFile;
  private final Map<Long, BloodCenter> centers = new LinkedHashMap<Long, BloodCenter>();
  private final List<BloodInventory> inventory = new ArrayList<BloodInventory>();
  private long nextCenterId = 1;

  private BloodCenterRepository(Path dataFile) {
    this.dataFile = dataFile;
  }

  public static BloodCenterRepository open(Path dataFile) {
    BloodCenterRepository repository = new BloodCenterRepository(dataFile);
    repository.load();
    return repository;
  }

  public static boolean isSupportedBloodType(String bloodType) {
    for (String supported : BLOOD_TYPES) {
      if (supported.equalsIgnoreCase(bloodType)) {
        return true;
      }
    }
    return false;
  }

  public synchronized List<BloodCenter> listCenters(String city) {
    String normalizedCity = city == null ? null : city.trim();
    List<BloodCenter> result = new ArrayList<BloodCenter>();
    for (BloodCenter center : centers.values()) {
      if (normalizedCity == null || normalizedCity.isEmpty()
          || center.getCity().equalsIgnoreCase(normalizedCity)) {
        result.add(center);
      }
    }
    result.sort(Comparator.comparing(BloodCenter::getName, String.CASE_INSENSITIVE_ORDER));
    return result;
  }

  public synchronized BloodCenter findCenter(long centerId) {
    return centers.get(centerId);
  }

  public synchronized List<BloodInventory> listInventory(long centerId) {
    List<BloodInventory> result = new ArrayList<BloodInventory>();
    for (BloodInventory item : inventory) {
      if (item.getCenterId() == centerId) {
        result.add(item);
      }
    }
    result.sort(Comparator.comparing(BloodInventory::getBloodType));
    return result;
  }

  public synchronized BloodCenter createCenter(
      String name,
      String city,
      String address,
      String contact,
      Double latitude,
      Double longitude,
      String status,
      String operatingHours) {
    for (BloodCenter existing : centers.values()) {
      if (existing.getName().equalsIgnoreCase(name) && existing.getCity().equalsIgnoreCase(city)) {
        throw new DuplicateCenterException("That blood center already exists in this city.");
      }
    }

    String now = now();
    BloodCenter center = new BloodCenter(
        nextCenterId++,
        name,
        city,
        address,
        contact,
        latitude,
        longitude,
        status == null || status.isEmpty() ? "open" : status,
        operatingHours,
        now,
        now);
    centers.put(center.getId(), center);

    for (String bloodType : BLOOD_TYPES) {
      inventory.add(new BloodInventory(center.getId(), bloodType, 0, 0, 5, now));
    }

    save();
    return center;
  }

  public synchronized BloodInventory updateInventory(
      long centerId,
      String bloodType,
      int unitsAvailable,
      int unitsReserved,
      int criticalThreshold) {
    if (!centers.containsKey(centerId)) {
      throw new CenterNotFoundException("Blood center not found.");
    }

    BloodInventory target = null;
    for (BloodInventory item : inventory) {
      if (item.getCenterId() == centerId && item.getBloodType().equalsIgnoreCase(bloodType)) {
        target = item;
        break;
      }
    }

    String now = now();
    if (target == null) {
      target = new BloodInventory(centerId, bloodType, unitsAvailable, unitsReserved, criticalThreshold, now);
      inventory.add(target);
    } else {
      target.update(unitsAvailable, unitsReserved, criticalThreshold, now);
    }

    save();
    return target;
  }

  private void load() {
    if (dataFile != null && Files.isRegularFile(dataFile)) {
      try {
        String text = new String(Files.readAllBytes(dataFile), StandardCharsets.UTF_8);
        Map<String, Object> root = Json.asObject(Json.parse(text));
        nextCenterId = Json.getLong(root, "nextCenterId", 1);

        Object centersValue = root.get("centers");
        if (centersValue instanceof Iterable) {
          for (Object item : (Iterable<?>) centersValue) {
            if (item instanceof Map) {
              BloodCenter center = BloodCenter.fromJson(Json.asObject(item));
              if (center.getId() > 0) {
                centers.put(center.getId(), center);
              }
            }
          }
        }

        Object inventoryValue = root.get("inventory");
        if (inventoryValue instanceof Iterable) {
          for (Object item : (Iterable<?>) inventoryValue) {
            if (item instanceof Map) {
              BloodInventory stock = BloodInventory.fromJson(Json.asObject(item));
              if (stock.getCenterId() > 0 && stock.getBloodType() != null) {
                inventory.add(stock);
              }
            }
          }
        }

        if (!centers.isEmpty()) {
          recomputeNextCenterId();
          return;
        }
      } catch (Exception error) {
        System.err.println("Could not read tracking data from " + dataFile + ": " + error.getMessage());
        centers.clear();
        inventory.clear();
        nextCenterId = 1;
      }
    }

    seed();
    save();
  }

  private void seed() {
    Random random = new Random();
    String now = now();
    for (String[] defaults : DEFAULT_CENTERS) {
      BloodCenter center = new BloodCenter(
          nextCenterId++,
          defaults[0],
          defaults[1],
          defaults[2],
          defaults[3],
          null,
          null,
          "open",
          "24/7",
          now,
          now);
      centers.put(center.getId(), center);
      for (String bloodType : BLOOD_TYPES) {
        inventory.add(new BloodInventory(
            center.getId(),
            bloodType,
            2 + random.nextInt(20),
            0,
            5,
            now));
      }
    }
    System.out.println("Seeded " + centers.size() + " blood centers into " + dataFile);
  }

  private void recomputeNextCenterId() {
    long highest = 0;
    for (Long centerId : centers.keySet()) {
      highest = Math.max(highest, centerId.longValue());
    }
    nextCenterId = Math.max(nextCenterId, highest + 1);
  }

  private Map<String, Object> snapshot() {
    Map<String, Object> root = new LinkedHashMap<String, Object>();
    root.put("nextCenterId", nextCenterId);

    List<Object> centerList = new ArrayList<Object>();
    for (BloodCenter center : centers.values()) {
      centerList.add(center.toJson());
    }
    root.put("centers", centerList);

    List<Object> inventoryList = new ArrayList<Object>();
    for (BloodInventory item : inventory) {
      inventoryList.add(item.toJson());
    }
    root.put("inventory", inventoryList);
    return root;
  }

  private void save() {
    if (dataFile == null) {
      return;
    }

    try {
      Path absolute = dataFile.toAbsolutePath();
      Path parent = absolute.getParent();
      if (parent != null) {
        Files.createDirectories(parent);
      }

      Path temporary = absolute.resolveSibling(absolute.getFileName().toString() + ".tmp");
      Files.write(temporary, Json.stringify(snapshot()).getBytes(StandardCharsets.UTF_8));
      try {
        Files.move(
            temporary,
            absolute,
            StandardCopyOption.REPLACE_EXISTING,
            StandardCopyOption.ATOMIC_MOVE);
      } catch (AtomicMoveNotSupportedException ignored) {
        Files.move(temporary, absolute, StandardCopyOption.REPLACE_EXISTING);
      }
    } catch (IOException error) {
      throw new IllegalStateException("Unable to save tracking data to " + dataFile, error);
    }
  }

  private static String now() {
    return Instant.now().toString();
  }

  public static final class DuplicateCenterException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    private DuplicateCenterException(String message) {
      super(message);
    }
  }

  public static final class CenterNotFoundException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    private CenterNotFoundException(String message) {
      super(message);
    }
  }
}
