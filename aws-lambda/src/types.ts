export interface User {
  id: string;
  email: string;
  name?: string;
  seniorityLevel?: string;
  careerLadder?: string;
  previousFeedback?: string;
  googleCalendarToken?: string;
  todoistToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeeklySnippet {
  id: string;
  userId: string;
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  content: string;
  extractedTasks?: string;
  extractedMeetings?: string;
  aiSuggestions?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Integration {
  id: string;
  userId: string;
  type: 'google_calendar' | 'todoist';
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}