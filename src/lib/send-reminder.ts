import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

interface ReminderEvent {
  title: string;
  date: string;          // formatted date string
  rawDate?: string;      // unformatted ISO date for URL linking
  startTime?: string;    // formatted time string
  endTime?: string;
  category?: string;
  calendarTitle: string;
  calendarId?: string;
  calendarType?: "academic" | "personal";
  countdown: string;     // "Today", "Tomorrow", "In 3 days"
}

const categoryColors: Record<string, string> = {
  registration: "#3b82f6",
  classes: "#22c55e",
  exam: "#ef4444",
  holiday: "#a855f7",
  deadline: "#f97316",
  event: "#06b6d4",
  class: "#22c55e",
  assignment: "#f59e0b",
  personal: "#ec4899",
  reminder: "#6366f1",
  other: "#6b7280",
};

function eventRow(event: ReminderEvent): string {
  const color = categoryColors[event.category || "other"] || "#6b7280";
  const timeStr = event.startTime
    ? `${event.startTime}${event.endTime ? ` – ${event.endTime}` : ""}`
    : "All day";
  return `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 4px; height: 40px; border-radius: 4px; background: ${color}; flex-shrink: 0;"></div>
          <div style="flex: 1;">
            <div style="font-weight: 600; color: #1a1a1a; font-size: 14px;">${event.title}</div>
            <div style="color: #6b7280; font-size: 12px; margin-top: 2px;">
              📅 ${event.date} &nbsp;·&nbsp; 🕐 ${timeStr} &nbsp;·&nbsp; 📋 ${event.calendarTitle}
            </div>
          </div>
          <div style="flex-shrink: 0;">
            <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; color: white; background: ${event.countdown === 'Today' ? '#ef4444' : event.countdown === 'Tomorrow' ? '#f97316' : '#3b82f6'};">
              ${event.countdown}
            </span>
          </div>
        </div>
      </td>
    </tr>
  `;
}

export async function sendReminderEmail(
  to: string,
  name: string,
  events: ReminderEvent[]
) {
  const eventRows = events.map(eventRow).join("");
  const count = events.length;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">🔔 Event Reminder</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">
          You have ${count} upcoming event${count > 1 ? "s" : ""} to prepare for
        </p>
      </div>

      <!-- Greeting -->
      <div style="padding: 24px 24px 8px;">
        <p style="color: #374151; font-size: 15px; margin: 0;">
          Hi <strong>${name}</strong>,
        </p>
        <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0;">
          Here's a reminder for your upcoming events:
        </p>
      </div>

      <!-- Events table -->
      <div style="padding: 8px 24px 24px;">
        <table width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          ${eventRows}
        </table>
      </div>

      <!-- CTA -->
      <div style="text-align: center; padding: 0 24px 32px;">
        <a href="${events[0]?.calendarId ? `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/tools/calendars?calendar=${events[0].calendarId}&date=${events[0].rawDate || ""}` : `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/tools/calendars`}"
           style="display: inline-block; padding: 12px 32px; background: #f97316; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Open Calendar →
        </a>
      </div>

      <!-- Footer -->
      <div style="background: #f9fafb; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">
          UIU Student Hub &copy; ${new Date().getFullYear()} &nbsp;|&nbsp;
          Manage your reminders in <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/profile" style="color: #f97316;">Profile Settings</a>
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"UIU Student Hub" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: `🔔 Reminder: ${count === 1 ? events[0].title : `${count} upcoming events`}`,
    html,
  });
}
export interface ConfirmationEvent {
  title: string;
  date: string;
  rawDate?: string;
  startTime?: string;
  calendarTitle: string;
  calendarId?: string;
  calendarType?: "academic" | "personal";
  category?: string;
}

export async function sendReminderConfirmation(
  to: string,
  name: string,
  events: ConfirmationEvent[],
  offsets: string[]
) {
  const count = events.length;
  const offsetLabels: Record<string, string> = {
    "morning": "Morning of the event",
    "1d": "1 day before",
    "3d": "3 days before",
    "1w": "1 week before",
  };
  const timingList = offsets.map(o => offsetLabels[o] || o).join(", ");

  const eventList = events.slice(0, 10).map(e => {
    const color = categoryColors[e.category || "other"] || "#6b7280";
    const time = e.startTime || "All day";
    return `
        <tr>
          <td style="padding: 10px 16px; border-bottom: 1px solid #f3f4f6;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 4px; height: 32px; border-radius: 4px; background: ${color}; flex-shrink: 0;"></div>
              <div>
                <div style="font-weight: 600; color: #1a1a1a; font-size: 14px;">${e.title}</div>
                <div style="color: #6b7280; font-size: 12px;">📅 ${e.date} · 🕐 ${time} · 📋 ${e.calendarTitle}</div>
              </div>
            </div>
          </td>
        </tr>`;
  }).join("");

  const moreText = count > 10 ? `<p style="color: #6b7280; font-size: 13px; text-align: center; margin-top: 8px;">...and ${count - 10} more event${count - 10 > 1 ? "s" : ""}</p>` : "";

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">✅ Reminder Set!</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">
          You'll be notified for ${count} event${count > 1 ? "s" : ""}
        </p>
      </div>

      <div style="padding: 24px 24px 8px;">
        <p style="color: #374151; font-size: 15px; margin: 0;">
          Hi <strong>${name}</strong>,
        </p>
        <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0;">
          Your email reminder${count > 1 ? "s have" : " has"} been set up successfully. Here's what you'll be reminded about:
        </p>
      </div>

      <div style="padding: 8px 24px 16px;">
        <table width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          ${eventList}
        </table>
        ${moreText}
      </div>

      <div style="padding: 0 24px 24px;">
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px;">
          <p style="color: #166534; font-size: 13px; font-weight: 600; margin: 0 0 4px;">⏰ You'll receive emails:</p>
          <p style="color: #15803d; font-size: 13px; margin: 0;">${timingList}</p>
        </div>
      </div>

      <div style="text-align: center; padding: 0 24px 32px;">
        <a href="${events[0]?.calendarId ? `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/tools/calendars?calendar=${events[0].calendarId}&date=${events[0].rawDate || ""}` : `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/tools/calendars`}"
           style="display: inline-block; padding: 12px 32px; background: #f97316; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Open Calendar →
        </a>
      </div>

      <div style="background: #f9fafb; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">
          UIU Student Hub &copy; ${new Date().getFullYear()} &nbsp;|&nbsp;
          <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/profile" style="color: #f97316;">Manage Reminders</a>
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"UIU Student Hub" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: `✅ Reminder set: ${count === 1 ? events[0].title : `${count} events`}`,
    html,
  });
}

export async function sendDailyDigestEmail(
  to: string,
  name: string,
  calendarTitle: string,
  calendarId: string,
  calendarType: string,
  events: any[]
) {
  const count = events.length;
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const calLink = `${baseUrl}/tools/calendars?calendar=${calendarId}`;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  let eventsHtml = "";

  if (count === 0) {
    eventsHtml = `
      <div style="text-align: center; padding: 20px;">
        <p style="color: #6b7280; font-size: 16px;">You have no events scheduled for today.</p>
        <p style="color: #6b7280; font-size: 14px;">Enjoy your free time!</p>
      </div>
    `;
  } else {
    eventsHtml = events.map((event) => `
      <div style="margin-bottom: 12px; padding: 16px; background: #ffffff; border: 1px solid #f3f4f6; border-radius: 8px;">
        <h4 style="margin: 0 0 4px; font-size: 16px; color: #111827;">${event.title}</h4>
        ${event.startTime ? `<p style="margin: 0; color: #6b7280; font-size: 13px;">🕒 ${event.startTime}${event.endTime ? ` - ${event.endTime}` : ""}</p>` : ""}
      </div>
    `).join("");
  }

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
      
      <div style="background: linear-gradient(to right, #6366f1, #a855f7); padding: 32px 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Daily Digest</h1>
        <p style="color: #e0e7ff; margin: 8px 0 0; font-size: 15px;">${today} • ${calendarTitle}</p>
      </div>

      <div style="padding: 32px 24px 24px;">
        <p style="color: #374151; font-size: 15px; margin: 0 0 24px;">Hi ${name},</p>
        <p style="color: #4b5563; font-size: 15px; margin: 0 0 24px;">Here is your agenda for today in <strong>${calendarTitle}</strong>.</p>
        
        <div style="margin-bottom: 24px;">
          ${eventsHtml}
        </div>
      </div>

      <div style="text-align: center; padding: 0 24px 32px;">
        <a href="${calLink}"
           style="display: inline-block; padding: 12px 32px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
           View Calendar →
        </a>
      </div>

      <div style="background: #f9fafb; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">
          UIU Student Hub &copy; ${new Date().getFullYear()} &nbsp;|&nbsp;
          <a href="${baseUrl}/profile" style="color: #6366f1;">Manage Notifications</a>
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"UIU Student Hub" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: count === 0 ? `☕ Your Daily Digest: No events today` : `📅 Your Daily Digest: ${count} event${count === 1 ? "" : "s"} today`,
    html,
  });
}
