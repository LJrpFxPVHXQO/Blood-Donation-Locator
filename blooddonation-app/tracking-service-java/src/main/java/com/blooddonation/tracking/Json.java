package com.blooddonation.tracking;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Minimal JSON reader/writer so the tracking service has no third-party dependencies.
 */
public final class Json {
  private Json() {
  }

  public static String stringify(Object value) {
    StringBuilder builder = new StringBuilder();
    write(builder, value);
    return builder.toString();
  }

  private static void write(StringBuilder builder, Object value) {
    if (value == null) {
      builder.append("null");
      return;
    }

    if (value instanceof String) {
      writeString(builder, (String) value);
      return;
    }

    if (value instanceof Number || value instanceof Boolean) {
      builder.append(value.toString());
      return;
    }

    if (value instanceof Map) {
      builder.append('{');
      boolean first = true;
      for (Object entryObject : ((Map<?, ?>) value).entrySet()) {
        Map.Entry<?, ?> entry = (Map.Entry<?, ?>) entryObject;
        if (!first) {
          builder.append(',');
        }
        first = false;
        writeString(builder, String.valueOf(entry.getKey()));
        builder.append(':');
        write(builder, entry.getValue());
      }
      builder.append('}');
      return;
    }

    if (value instanceof Iterable) {
      builder.append('[');
      boolean first = true;
      for (Object item : (Iterable<?>) value) {
        if (!first) {
          builder.append(',');
        }
        first = false;
        write(builder, item);
      }
      builder.append(']');
      return;
    }

    writeString(builder, String.valueOf(value));
  }

  private static void writeString(StringBuilder builder, String value) {
    builder.append('"');
    for (int index = 0; index < value.length(); index++) {
      char character = value.charAt(index);
      switch (character) {
        case '"':
          builder.append("\\\"");
          break;
        case '\\':
          builder.append("\\\\");
          break;
        case '\b':
          builder.append("\\b");
          break;
        case '\f':
          builder.append("\\f");
          break;
        case '\n':
          builder.append("\\n");
          break;
        case '\r':
          builder.append("\\r");
          break;
        case '\t':
          builder.append("\\t");
          break;
        default:
          if (character < 0x20) {
            builder.append(String.format("\\u%04x", (int) character));
          } else {
            builder.append(character);
          }
      }
    }
    builder.append('"');
  }

  public static Object parse(String text) {
    Parser parser = new Parser(text);
    Object value = parser.parseValue();
    parser.skipWhitespace();
    if (!parser.atEnd()) {
      throw parser.error("Unexpected trailing content");
    }
    return value;
  }

  @SuppressWarnings("unchecked")
  public static Map<String, Object> asObject(Object value) {
    if (value instanceof Map) {
      return (Map<String, Object>) value;
    }
    throw new IllegalArgumentException("Expected a JSON object.");
  }

  public static String getString(Map<String, Object> object, String key) {
    Object value = object.get(key);
    return value instanceof String ? (String) value : null;
  }

  public static long getLong(Map<String, Object> object, String key, long fallback) {
    Object value = object.get(key);
    if (value instanceof Number) {
      return ((Number) value).longValue();
    }
    if (value instanceof String) {
      try {
        return Long.parseLong(((String) value).trim());
      } catch (NumberFormatException ignored) {
        return fallback;
      }
    }
    return fallback;
  }

  public static int getInt(Map<String, Object> object, String key, int fallback) {
    return (int) getLong(object, key, fallback);
  }

  public static Double getDouble(Map<String, Object> object, String key) {
    Object value = object.get(key);
    if (value instanceof Number) {
      return ((Number) value).doubleValue();
    }
    if (value instanceof String) {
      try {
        return Double.valueOf(((String) value).trim());
      } catch (NumberFormatException ignored) {
        return null;
      }
    }
    return null;
  }

  private static final class Parser {
    private final String text;
    private int index;

    private Parser(String text) {
      this.text = text;
    }

    private boolean atEnd() {
      return index >= text.length();
    }

    private void skipWhitespace() {
      while (!atEnd() && Character.isWhitespace(text.charAt(index))) {
        index++;
      }
    }

    private Object parseValue() {
      skipWhitespace();
      if (atEnd()) {
        throw error("Unexpected end of input");
      }

      char character = text.charAt(index);
      switch (character) {
        case '{':
          return parseObject();
        case '[':
          return parseArray();
        case '"':
          return parseString();
        case 't':
          expectWord("true");
          return Boolean.TRUE;
        case 'f':
          expectWord("false");
          return Boolean.FALSE;
        case 'n':
          expectWord("null");
          return null;
        default:
          return parseNumber();
      }
    }

    private Map<String, Object> parseObject() {
      expect('{');
      Map<String, Object> object = new LinkedHashMap<String, Object>();
      skipWhitespace();
      if (!atEnd() && text.charAt(index) == '}') {
        index++;
        return object;
      }

      while (true) {
        skipWhitespace();
        if (atEnd() || text.charAt(index) != '"') {
          throw error("Expected a string key");
        }
        String key = parseString();
        skipWhitespace();
        expect(':');
        object.put(key, parseValue());
        skipWhitespace();
        if (atEnd()) {
          throw error("Unexpected end of object");
        }
        char next = text.charAt(index++);
        if (next == '}') {
          return object;
        }
        if (next != ',') {
          throw error("Expected ',' or '}'");
        }
      }
    }

    private List<Object> parseArray() {
      expect('[');
      List<Object> array = new ArrayList<Object>();
      skipWhitespace();
      if (!atEnd() && text.charAt(index) == ']') {
        index++;
        return array;
      }

      while (true) {
        array.add(parseValue());
        skipWhitespace();
        if (atEnd()) {
          throw error("Unexpected end of array");
        }
        char next = text.charAt(index++);
        if (next == ']') {
          return array;
        }
        if (next != ',') {
          throw error("Expected ',' or ']'");
        }
      }
    }

    private String parseString() {
      expect('"');
      StringBuilder builder = new StringBuilder();
      while (!atEnd()) {
        char character = text.charAt(index++);
        if (character == '"') {
          return builder.toString();
        }
        if (character != '\\') {
          builder.append(character);
          continue;
        }

        if (atEnd()) {
          throw error("Unterminated escape sequence");
        }
        char escape = text.charAt(index++);
        switch (escape) {
          case '"':
            builder.append('"');
            break;
          case '\\':
            builder.append('\\');
            break;
          case '/':
            builder.append('/');
            break;
          case 'b':
            builder.append('\b');
            break;
          case 'f':
            builder.append('\f');
            break;
          case 'n':
            builder.append('\n');
            break;
          case 'r':
            builder.append('\r');
            break;
          case 't':
            builder.append('\t');
            break;
          case 'u':
            if (index + 4 > text.length()) {
              throw error("Invalid unicode escape");
            }
            String hex = text.substring(index, index + 4);
            index += 4;
            try {
              builder.append((char) Integer.parseInt(hex, 16));
            } catch (NumberFormatException invalidHex) {
              throw error("Invalid unicode escape");
            }
            break;
          default:
            throw error("Invalid escape sequence");
        }
      }
      throw error("Unterminated string");
    }

    private Object parseNumber() {
      int start = index;
      while (!atEnd()) {
        char character = text.charAt(index);
        if (character == '-' || character == '+' || character == '.'
            || (character >= '0' && character <= '9')
            || character == 'e' || character == 'E') {
          index++;
        } else {
          break;
        }
      }

      if (start == index) {
        throw error("Expected a JSON value");
      }

      String token = text.substring(start, index);
      try {
        if (token.indexOf('.') < 0 && token.indexOf('e') < 0 && token.indexOf('E') < 0) {
          return Long.valueOf(token);
        }
        return Double.valueOf(token);
      } catch (NumberFormatException invalidNumber) {
        throw error("Invalid number");
      }
    }

    private void expect(char expected) {
      if (atEnd() || text.charAt(index) != expected) {
        throw error("Expected '" + expected + "'");
      }
      index++;
    }

    private void expectWord(String word) {
      if (!text.startsWith(word, index)) {
        throw error("Expected '" + word + "'");
      }
      index += word.length();
    }

    private IllegalArgumentException error(String message) {
      return new IllegalArgumentException(message + " at position " + index);
    }
  }
}
