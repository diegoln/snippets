# Google Workspace API Response Formats

This document specifies the exact API response formats that must be used when generating mock data for Google Workspace services.

## Google Calendar API v3 Event Format

### Basic Event Structure

```json
{
  "kind": "calendar#event",
  "etag": "\"3432401934000000\"",
  "id": "4c8d2j9m3n1k2l5p6q7r8s9t0u1v2w3x",
  "status": "confirmed",
  "htmlLink": "https://calendar.google.com/event?eid=...",
  "created": "2024-09-25T14:20:00.000Z",
  "updated": "2024-10-01T08:45:00.000Z",
  "summary": "Meeting Title",
  "description": "Meeting description with agenda items",
  "location": "Conference Room A / Google Meet",
  "creator": {
    "email": "organizer@company.com",
    "displayName": "Organizer Name",
    "self": false
  },
  "organizer": {
    "email": "organizer@company.com", 
    "displayName": "Organizer Name",
    "self": false
  },
  "start": {
    "dateTime": "2024-10-01T09:00:00-07:00",
    "timeZone": "America/Los_Angeles"
  },
  "end": {
    "dateTime": "2024-10-01T09:15:00-07:00",
    "timeZone": "America/Los_Angeles"
  },
  "iCalUID": "4c8d2j9m3n1k2l5p6q7r8s9t0u1v2w3x@google.com",
  "sequence": 0,
  "attendees": [
    {
      "email": "attendee@company.com",
      "displayName": "Attendee Name",
      "self": true,
      "responseStatus": "accepted"
    }
  ],
  "conferenceData": {
    "conferenceId": "meet-conference-id",
    "conferenceSolution": {
      "name": "Google Meet",
      "iconUri": "https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png"
    },
    "entryPoints": [
      {
        "entryPointType": "video",
        "uri": "https://meet.google.com/abc-defg-hij"
      }
    ]
  }
}
```

### Recurring Events

For recurring events, add:

```json
{
  "recurrence": [
    "RRULE:FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR"
  ]
}
```

Common recurrence patterns:
- Daily standups: `"RRULE:FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR"`
- Weekly 1:1s: `"RRULE:FREQ=WEEKLY;BYDAY=TU"`
- Bi-weekly planning: `"RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO"`

## Google Meet API v2 Transcript Format

### Conference Record Structure

```json
{
  "conferenceRecord": {
    "name": "conferenceRecords/meet-conference-id",
    "startTime": "2024-10-01T21:01:23.456Z",
    "endTime": "2024-10-01T21:29:15.789Z",
    "space": {
      "name": "spaces/meet-space-id",
      "meetingUri": "https://meet.google.com/abc-defg-hij"
    }
  },
  "transcript": {
    "name": "conferenceRecords/meet-conference-id/transcripts/transcript_001",
    "state": "ENDED",
    "startTime": "2024-10-01T21:01:23.456Z",
    "endTime": "2024-10-01T21:29:15.789Z"
  },
  "transcriptEntries": [
    {
      "name": "conferenceRecords/meet-conference-id/transcripts/transcript_001/entries/entry_001",
      "participant": "conferenceRecords/meet-conference-id/participants/participant_user_name",
      "text": "Spoken text content",
      "languageCode": "en-US",
      "startTime": "2024-10-01T21:01:25.123Z",
      "endTime": "2024-10-01T21:01:29.456Z"
    }
  ],
  "participants": [
    {
      "name": "conferenceRecords/meet-conference-id/participants/participant_user_name",
      "signedInUser": {
        "user": "users/email@company.com",
        "displayName": "User Name"
      }
    }
  ]
}
```

### Timing Guidelines

- Entry start times should progress sequentially
- Allow 1-5 second gaps between speakers for natural flow
- Longer pauses (5-10 seconds) can indicate thinking time
- Entry duration should match realistic speaking pace (approximately 150-200 words per minute)

### Participant Naming Convention

- Use consistent participant identifiers: `participant_first_last`
- Replace special characters and spaces with underscores
- Example: "Jack Thompson" → `participant_jack_thompson`

## Google Docs API v1 Document Format

### Document Structure

```json
{
  "kind": "docs#document",
  "documentId": "unique_document_id",
  "title": "Document Title",
  "body": {
    "content": [
      {
        "startIndex": 1,
        "endIndex": 12,
        "paragraph": {
          "elements": [
            {
              "startIndex": 1,
              "endIndex": 11,
              "textRun": {
                "content": "Content text\\n",
                "textStyle": {
                  "bold": true,
                  "fontSize": {
                    "magnitude": 18,
                    "unit": "PT"
                  }
                }
              }
            }
          ]
        }
      }
    ]
  },
  "documentStyle": {
    "background": {
      "color": {}
    },
    "pageNumberStart": 1,
    "marginTop": {
      "magnitude": 72,
      "unit": "PT"
    },
    "marginBottom": {
      "magnitude": 72,
      "unit": "PT"
    },
    "marginRight": {
      "magnitude": 72,
      "unit": "PT"
    },
    "marginLeft": {
      "magnitude": 72,
      "unit": "PT"
    },
    "pageSize": {
      "height": {
        "magnitude": 792,
        "unit": "PT"
      },
      "width": {
        "magnitude": 612,
        "unit": "PT"
      }
    }
  },
  "revisionId": "ALm37BWWsBmvNKgBUAr71YwxjTg5SDyqEg",
  "suggestionsViewMode": "SUGGESTIONS_INLINE"
}
```

### Text Styling

Common text styles for meeting notes:

- **Headers**: `bold: true, fontSize: 18pt`
- **Subheaders**: `bold: true, fontSize: 12pt`
- **Body text**: Default styling
- **Generated note footer**: `italic: true, foregroundColor: gray, fontSize: 9pt`

### Bullet Lists

```json
{
  "bullet": {
    "listId": "kix.list001",
    "nestingLevel": 0
  }
}
```

Include corresponding list definition in the `lists` section:

```json
{
  "lists": {
    "kix.list001": {
      "listProperties": {
        "nestingLevels": [
          {
            "bulletAlignment": "START",
            "glyphFormat": "%0",
            "glyphSymbol": "●",
            "glyphType": "GLYPH_TYPE_UNSPECIFIED",
            "indentFirstLine": {
              "magnitude": 18,
              "unit": "PT"
            },
            "indentStart": {
              "magnitude": 36,
              "unit": "PT"
            },
            "textStyle": {}
          }
        ]
      }
    }
  }
}
```

## ID Generation Guidelines

### Calendar Event IDs
- Use 32-character alphanumeric strings
- Pattern: `[a-z0-9]{32}`
- Example: `4c8d2j9m3n1k2l5p6q7r8s9t0u1v2w3x`

### Conference Record IDs
- Use descriptive names that include meeting type and date
- Pattern: `meet-[type]-[date]`
- Example: `meet-1on1-sarah-jack-weekly-oct15`

### Document IDs
- Use memorable but unique identifiers
- Include participant names and dates
- Example: `1J4cK_1oN1_S4r4H_0cT01_2024_mEeTiNgNoTeS`

## Timestamp Formatting

All timestamps must use ISO 8601 format with microsecond precision:

- Calendar events: `"2024-10-01T09:00:00-07:00"` (with timezone)
- Meet transcripts: `"2024-10-01T21:01:23.456Z"` (UTC with microseconds)

## Required Fields vs Optional Fields

### Always Required
- `kind` (for Calendar events)
- `id`, `summary`, `start`, `end` (Calendar)
- `name`, `startTime`, `endTime` (Meet transcripts)
- `text`, `participant`, `startTime`, `endTime` (Transcript entries)

### Commonly Optional
- `description`, `location` (Calendar events)
- `creator` (if different from organizer)
- `recurrence` (only for recurring events)

## Validation Checklist

- [ ] All required fields present
- [ ] Timestamp formats consistent
- [ ] ID patterns follow conventions
- [ ] Participant names consistent across related records
- [ ] Conference data matches between Calendar and Meet records
- [ ] Text content uses proper escaping for special characters
- [ ] Durations and timing are realistic