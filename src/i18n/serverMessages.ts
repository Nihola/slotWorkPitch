// User-facing messages the SERVER sends (server/*.ts). The API client translates them when an error arrives, so they have no t() call in the client code.
// Messages not listed here still work: they are shown in English until added to the dictionaries.
export const SERVER_MESSAGES: string[] = [
  "Email or password is incorrect.",
  "Enter your password.",
  "An account with this email already exists.",
  "Choose what you are looking for.",
  "Your current password is incorrect.",
  "Choose a password you have not used just now.",
  "You've already applied to this job.",
  "You've already reported this job. Our team is looking at it.",
  "This job has already been reviewed.",
  "Finish your profile before applying.",
  "This job is no longer accepting applications.",
  "Please sign in to continue.",
  "You do not have access to that.",
  "Write a message first.",
  "Keep messages under 2,000 characters.",
  "Jobs can be scheduled between 8:00 and 22:00.",
  "This reset link is invalid or has expired. Request a new one."
]
