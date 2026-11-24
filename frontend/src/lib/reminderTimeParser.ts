export function parseReminderTime(text: string): string | null {
  const now = new Date();
  const input = text.toLowerCase().trim();

  // =========================================
  // 1. Relative time (English, Hindi, Roman Hindi)
  // =========================================

  const relativePatterns = [
    /\bin\s+(\d+)\s+(minutes?|mins?|hours?|days?)\b/i,
    /(\d+)\s+(minutes?|mins?|hours?|days?)\s+(?:from\s+now)?\b/i,
    /(\d+)\s+(मिनट|मिनिट|घंटे|घंटा|दिन)\s*(?:में|बाद)?/i,
    /(\d+)\s+(minute|minutes|min|ghanta|ghante|ghanton|din)\s*(?:mein|baad)?/i,
  ];

  for (const pattern of relativePatterns) {
    const match = input.match(pattern);

    if (match) {
      const amount = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();

      if (!amount || amount <= 0) return null;

      const scheduled = new Date(now);

      if (
        unit.startsWith("min") ||
        unit.includes("मिनट") ||
        unit.includes("मिनिट")
      ) {
        scheduled.setMinutes(scheduled.getMinutes() + amount);
      } else if (
        unit.startsWith("hour") ||
        unit.includes("घंट") ||
        unit.includes("ghanta") ||
        unit.includes("ghante") ||
        unit.includes("ghanton")
      ) {
        scheduled.setHours(scheduled.getHours() + amount);
      } else {
        scheduled.setDate(scheduled.getDate() + amount);
      }

      return scheduled.toISOString();
    }
  }

  // =========================================
  // 2. Tomorrow detection
  // =========================================

  const isTomorrow =
    /\btomorrow\b/i.test(input) ||
    /कल/.test(input) ||
    /\bkal\b/i.test(input);

  // =========================================
  // 3. Clock time
  // =========================================

  const timeMatch = input.match(
    /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i
  );

  if (timeMatch) {
    const rawHours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2] || "0", 10);
    const meridiem = timeMatch[3]?.toLowerCase();

    let hours = rawHours;

    if (meridiem) {
      if (rawHours < 1 || rawHours > 12) return null;

      if (meridiem === "pm" && hours !== 12) {
        hours += 12;
      }

      if (meridiem === "am" && hours === 12) {
        hours = 0;
      }
    } else if (rawHours > 23) {
      return null;
    }

    if (minutes > 59) return null;

    const scheduled = new Date(now);

    scheduled.setHours(hours, minutes, 0, 0);

    if (isTomorrow) {
      scheduled.setDate(scheduled.getDate() + 1);
    } else if (scheduled <= now) {
      scheduled.setDate(scheduled.getDate() + 1);
    }

    return scheduled.toISOString();
  }

  // =========================================
  // 4. Tomorrow without specific time
  // =========================================

  if (isTomorrow) {
    const scheduled = new Date(now);

    scheduled.setDate(scheduled.getDate() + 1);

    return scheduled.toISOString();
  }

  return null;
}

// =========================================
// Clean reminder message
// =========================================

export function cleanReminderMessage(text: string): string {
  let message = text.trim();

  // Remove reminder prefixes
  message = message.replace(
    /^(please\s+)?(remind me to|remind me|please remind me to|please remind me|set a reminder to|set reminder to|create a reminder to|reminder to)\s+/i,
    ""
  );

  // Remove English relative times
  message = message.replace(
    /\s+in\s+\d+\s+(minutes?|mins?|hours?|days?)\b/gi,
    ""
  );

  message = message.replace(
    /\s+\d+\s+(minutes?|mins?|hours?|days?)\s+(?:from\s+now)?\b/gi,
    ""
  );

  // Remove Hindi relative times
  message = message.replace(
    /\s*\d+\s+(मिनट|मिनिट|घंटे|घंटा|दिन)\s*(में|बाद)?/gi,
    ""
  );

  // Remove Roman Hindi relative times
  message = message.replace(
    /\s*\d+\s+(minute|minutes|min|ghanta|ghante|ghanton|din)\s*(mein|baad)?/gi,
    ""
  );

  // Remove clock times
  message = message.replace(
    /\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi,
    ""
  );

  // Remove tomorrow
  message = message.replace(/\s+tomorrow\b/gi, "");
  message = message.replace(/\s+कल\b/gi, "");
  message = message.replace(/\s+kal\b/gi, "");

  // Remove common Roman Hindi phrases
  message = message.replace(
    /^(mujhe|please)\s+/i,
    ""
  );

  message = message.replace(
    /\s+(yaad dilana|yaad dilana|yaad dila dena)\b/gi,
    ""
  );

  // Remove common Hindi reminder phrases
  message = message.replace(
    /मुझे|याद दिलाना|याद दिला|याद रखना/gi,
    ""
  );

  // Normalize whitespace
  message = message.replace(/\s+/g, " ").trim();

  // Fallback
  if (!message) {
    return text.trim();
  }

  return message.charAt(0).toUpperCase() + message.slice(1);
}