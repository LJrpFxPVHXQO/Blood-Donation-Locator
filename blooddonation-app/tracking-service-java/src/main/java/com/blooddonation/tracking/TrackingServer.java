package com.blooddonation.tracking;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Dependency-free Java live tracking API for blood centers and their inventory.
 *
 * <p>It serves the same routes the React locator already uses, on port 3002 by default:
 * <ul>
 *   <li>GET /api/blood-centers</li>
 *   <li>GET /api/blood-centers/{id}/inventory</li>
 *   <li>POST /api/blood-centers</li>
 *   <li>PUT /api/blood-inventory</li>
 * </ul>
 */
public final class TrackingServer {
  private static final int DEFAULT_PORT = 3002;
  private static final String DEFAULT_HOST = "127.0.0.1";
  private static final String DEFAULT_DATA_FILE = "data/blood-centers.json";

  private final BloodCenterRepository repository;

  private TrackingServer(BloodCenterRepository repository) {
    this.repository = repository;
  }

  public static void main(String[] args) throws Exception {
    int port = readPort();
    String host = readEnv("TRACKING_HOST", DEFAULT_HOST);
    Path dataFile = Paths.get(readEnv("TRACKING_DATA_FILE", DEFAULT_DATA_FILE));
    BloodCenterRepository repository = BloodCenterRepository.open(dataFile);

    TrackingServer application = new TrackingServer(repository);
    HttpServer server = HttpServer.create(new InetSocketAddress(host, port), 0);
    ExecutorService executor = Executors.newFixedThreadPool(
        Math.max(4, Runtime.getRuntime().availableProcessors()));
    server.setExecutor(executor);
    server.createContext("/", application.new ApiHandler());
    server.start();

    System.out.println("Blood tracking service listening on http://" + host + ":" + port);
    System.out.println("Tracking data file: " + dataFile.toAbsolutePath().normalize());

    Runtime.getRuntime().addShutdownHook(new Thread(new Runnable() {
      @Override
      public void run() {
        server.stop(0);
        executor.shutdownNow();
      }
    }, "tracking-shutdown"));
  }

  private static int readPort() {
    String value = readEnv("TRACKING_PORT", String.valueOf(DEFAULT_PORT));
    try {
      int port = Integer.parseInt(value);
      if (port < 1 || port > 65535) {
        throw new NumberFormatException("out of range");
      }
      return port;
    } catch (NumberFormatException error) {
      System.err.println("Invalid TRACKING_PORT '" + value + "', using " + DEFAULT_PORT + ".");
      return DEFAULT_PORT;
    }
  }

  private static String readEnv(String key, String fallback) {
    String value = System.getenv(key);
    return value == null || value.trim().isEmpty() ? fallback : value.trim();
  }

  private final class ApiHandler implements HttpHandler {
    @Override
    public void handle(HttpExchange exchange) throws IOException {
      try {
        addCors(exchange.getResponseHeaders());

        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
          exchange.sendResponseHeaders(204, -1);
          return;
        }

        String path = normalizePath(exchange.getRequestURI().getPath());

        if ("/api/health".equals(path)) {
          Map<String, Object> payload = new LinkedHashMap<String, Object>();
          payload.put("status", "ok");
          sendJson(exchange, 200, payload);
          return;
        }

        if ("/api/blood-centers".equals(path)) {
          handleCenters(exchange);
          return;
        }

        if ("/api/blood-inventory".equals(path)) {
          handleInventoryUpdate(exchange);
          return;
        }

        String[] parts = path.split("/");
        if (parts.length == 5
            && "api".equals(parts[1])
            && "blood-centers".equals(parts[2])
            && "inventory".equals(parts[4])) {
          handleInventory(exchange, parts[3]);
          return;
        }

        sendError(exchange, 404, "Not found.");
      } catch (ApiException error) {
        sendError(exchange, error.getStatus(), error.getMessage());
      } catch (IllegalArgumentException error) {
        sendError(exchange, 400, error.getMessage());
      } catch (Exception error) {
        error.printStackTrace();
        sendError(exchange, 500, "Unexpected server error.");
      } finally {
        exchange.close();
      }
    }

    private void handleCenters(HttpExchange exchange) throws IOException {
      if ("GET".equalsIgnoreCase(exchange.getRequestMethod())) {
        String city = queryParameter(exchange.getRequestURI().getRawQuery(), "city");
        List<Object> centers = new ArrayList<Object>();
        for (BloodCenter center : repository.listCenters(city)) {
          centers.add(center.toJson());
        }

        Map<String, Object> payload = new LinkedHashMap<String, Object>();
        payload.put("centers", centers);
        sendJson(exchange, 200, payload);
        return;
      }

      if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
        Map<String, Object> body = readObjectBody(exchange);
        String name = requireText(body, "name", 150, "Name is required.");
        String city = requireText(body, "city", 120, "City is required.");
        String address = optionalText(body, "address", 255);
        String contact = optionalText(body, "contact", 60);
        String status = optionalText(body, "status", 20);
        String operatingHours = optionalText(body, "operating_hours", 100);
        Double latitude = optionalNumber(body, "latitude");
        Double longitude = optionalNumber(body, "longitude");

        try {
          BloodCenter center = repository.createCenter(
              name,
              city,
              address,
              contact,
              latitude,
              longitude,
              status,
              operatingHours);
          Map<String, Object> payload = new LinkedHashMap<String, Object>();
          payload.put("message", "Blood center created.");
          payload.put("id", center.getId());
          sendJson(exchange, 201, payload);
        } catch (BloodCenterRepository.DuplicateCenterException error) {
          sendError(exchange, 409, error.getMessage());
        }
        return;
      }

      sendError(exchange, 405, "Method not allowed.");
    }

    private void handleInventory(HttpExchange exchange, String idValue) throws IOException {
      if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
        sendError(exchange, 405, "Method not allowed.");
        return;
      }

      long centerId;
      try {
        centerId = Long.parseLong(idValue);
      } catch (NumberFormatException error) {
        throw new ApiException(400, "Invalid blood center ID.");
      }
      if (centerId < 1) {
        throw new ApiException(400, "Invalid blood center ID.");
      }

      BloodCenter center = repository.findCenter(centerId);
      if (center == null) {
        throw new ApiException(404, "Blood center not found.");
      }

      List<BloodInventory> inventory = repository.listInventory(centerId);
      List<Object> items = new ArrayList<Object>();
      for (BloodInventory item : inventory) {
        items.add(item.toJson());
      }

      Map<String, Object> payload = new LinkedHashMap<String, Object>();
      payload.put("center", center.toJson());
      payload.put("inventory", items);
      payload.put("lastUpdated", inventory.isEmpty()
          ? center.getLastUpdated()
          : inventory.get(0).getLastUpdated());
      sendJson(exchange, 200, payload);
    }

    private void handleInventoryUpdate(HttpExchange exchange) throws IOException {
      if (!"PUT".equalsIgnoreCase(exchange.getRequestMethod())) {
        sendError(exchange, 405, "Method not allowed.");
        return;
      }

      Map<String, Object> body = readObjectBody(exchange);
      long centerId = requireLong(body, "center_id", "A valid center_id is required.");
      String bloodType = requireText(body, "blood_type", 10, "blood_type is required.");
      int unitsAvailable = requireInt(body, "units_available", "units_available is required.");
      int unitsReserved = optionalInt(body, "units_reserved", 0);
      int criticalThreshold = optionalInt(body, "critical_threshold", 5);

      if (unitsAvailable < 0 || unitsReserved < 0 || criticalThreshold < 0) {
        throw new ApiException(400, "Inventory values cannot be negative.");
      }
      if (!BloodCenterRepository.isSupportedBloodType(bloodType)) {
        throw new ApiException(400, "Unsupported blood type.");
      }

      try {
        repository.updateInventory(
            centerId,
            bloodType.toUpperCase(),
            unitsAvailable,
            unitsReserved,
            criticalThreshold);
        Map<String, Object> payload = new LinkedHashMap<String, Object>();
        payload.put("message", "Inventory updated.");
        sendJson(exchange, 200, payload);
      } catch (BloodCenterRepository.CenterNotFoundException error) {
        sendError(exchange, 404, error.getMessage());
      }
    }

    private Map<String, Object> readObjectBody(HttpExchange exchange) throws IOException {
      String body = readBody(exchange);
      if (body.trim().isEmpty()) {
        throw new ApiException(400, "A JSON request body is required.");
      }

      Object parsed;
      try {
        parsed = Json.parse(body);
      } catch (IllegalArgumentException error) {
        throw new ApiException(400, "Invalid JSON body.");
      }

      if (!(parsed instanceof Map)) {
        throw new ApiException(400, "JSON body must be an object.");
      }
      return Json.asObject(parsed);
    }

    private String requireText(Map<String, Object> body, String key, int maxLength, String message) {
      String value = optionalText(body, key, maxLength);
      if (value == null) {
        throw new ApiException(400, message);
      }
      return value;
    }

    private String optionalText(Map<String, Object> body, String key, int maxLength) {
      Object value = body.get(key);
      if (value == null) {
        return null;
      }
      if (!(value instanceof String)) {
        throw new ApiException(400, key + " must be text.");
      }

      String text = ((String) value).trim();
      if (text.isEmpty()) {
        return null;
      }
      return text.length() > maxLength ? text.substring(0, maxLength) : text;
    }

    private Double optionalNumber(Map<String, Object> body, String key) {
      Object value = body.get(key);
      if (value == null) {
        return null;
      }
      if (value instanceof Number) {
        return ((Number) value).doubleValue();
      }
      if (value instanceof String) {
        try {
          return Double.valueOf(((String) value).trim());
        } catch (NumberFormatException error) {
          throw new ApiException(400, key + " must be a number.");
        }
      }
      throw new ApiException(400, key + " must be a number.");
    }

    private long requireLong(Map<String, Object> body, String key, String message) {
      Object value = body.get(key);
      if (value instanceof Number) {
        return ((Number) value).longValue();
      }
      if (value instanceof String) {
        try {
          return Long.parseLong(((String) value).trim());
        } catch (NumberFormatException ignored) {
          throw new ApiException(400, message);
        }
      }
      throw new ApiException(400, message);
    }

    private int requireInt(Map<String, Object> body, String key, String message) {
      Object value = body.get(key);
      if (value instanceof Number) {
        return (int) Math.round(((Number) value).doubleValue());
      }
      if (value instanceof String) {
        try {
          return (int) Math.round(Double.parseDouble(((String) value).trim()));
        } catch (NumberFormatException ignored) {
          throw new ApiException(400, message);
        }
      }
      throw new ApiException(400, message);
    }

    private int optionalInt(Map<String, Object> body, String key, int fallback) {
      Object value = body.get(key);
      if (value == null) {
        return fallback;
      }
      return requireInt(body, key, key + " must be a number.");
    }
  }

  private static String normalizePath(String path) {
    if (path == null || path.isEmpty()) {
      return "/";
    }
    if (path.length() > 1 && path.endsWith("/")) {
      return path.substring(0, path.length() - 1);
    }
    return path;
  }

  private static String queryParameter(String rawQuery, String name) {
    if (rawQuery == null || rawQuery.isEmpty()) {
      return null;
    }

    for (String pair : rawQuery.split("&")) {
      int separator = pair.indexOf('=');
      String key = separator < 0 ? pair : pair.substring(0, separator);
      if (!name.equals(key)) {
        continue;
      }
      String value = separator < 0 ? "" : pair.substring(separator + 1);
      try {
        return URLDecoder.decode(value, "UTF-8");
      } catch (IOException error) {
        return value;
      }
    }
    return null;
  }

  private static String readBody(HttpExchange exchange) throws IOException {
    try (InputStream input = exchange.getRequestBody();
        ByteArrayOutputStream output = new ByteArrayOutputStream()) {
      byte[] buffer = new byte[4096];
      int read;
      while ((read = input.read(buffer)) != -1) {
        output.write(buffer, 0, read);
      }
      return new String(output.toByteArray(), StandardCharsets.UTF_8);
    }
  }

  private static void sendJson(HttpExchange exchange, int status, Object payload) throws IOException {
    byte[] body = Json.stringify(payload).getBytes(StandardCharsets.UTF_8);
    Headers headers = exchange.getResponseHeaders();
    headers.set("Content-Type", "application/json; charset=utf-8");
    addCors(headers);
    exchange.sendResponseHeaders(status, body.length);
    try (OutputStream output = exchange.getResponseBody()) {
      output.write(body);
    }
  }

  private static void sendError(HttpExchange exchange, int status, String message) {
    Map<String, Object> payload = new LinkedHashMap<String, Object>();
    payload.put("message", message == null ? "Request failed." : message);
    try {
      sendJson(exchange, status, payload);
    } catch (IOException error) {
      error.printStackTrace();
    }
  }

  private static void addCors(Headers headers) {
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Max-Age", "86400");
  }

  private static final class ApiException extends RuntimeException {
    private static final long serialVersionUID = 1L;
    private final int status;

    private ApiException(int status, String message) {
      super(message);
      this.status = status;
    }

    private int getStatus() {
      return status;
    }
  }
}
