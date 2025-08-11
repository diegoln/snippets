# Data Organization Standards

This document defines the standardized file structure and naming conventions for organizing mock workspace datasets.

## Directory Structure

All mock datasets should be organized under `/data/mock-datasets/users/` with the following structure:

```
data/
├── mock-datasets/
│   └── users/
│       └── {user-identifier}/
│           ├── calendar-events/
│           ├── meet-transcripts/
│           ├── google-docs/
│           └── {dataset-name}.json
```

### Directory Definitions

- **`calendar-events/`**: Google Calendar API v3 event responses
- **`meet-transcripts/`**: Google Meet API v2 transcript files  
- **google-docs/`**: Google Docs API v1 document structures
- **Root level**: Main dataset file with comprehensive timeline and metadata

## Naming Conventions

### User Identifiers
- Use `{name}-{role}-{timeframe}` pattern
- Examples: `jack-thompson-oct-2024`, `sarah-manager-q4-2024`
- Use lowercase with hyphens for separation
- Include timeframe to allow for multiple datasets per person

### File Names

#### Calendar Events
- Pattern: `{event-type}-{date}.json`
- Examples: 
  - `daily-standup-oct-15.json`
  - `1on1-sarah-jack-oct-15.json`
  - `architecture-review-oct-17.json`

#### Meet Transcripts
- Pattern: `week{N}-{date}-{meeting-type}.json`
- Examples:
  - `week42-oct15-1on1-sarah-jack.json`
  - `week43-oct22-daily-standup.json`
  - `week44-oct29-pair-programming-mike-jack.json`

#### Google Docs
- Pattern: `Meeting Notes - {title} - {date}.json`
- Examples:
  - `Meeting Notes - 1on1 Sarah & Jack - Oct 1, 2024.json`
  - `Meeting Notes - Pair Programming Mike & Jack - Oct 29, 2024.json`
  - `Meeting Notes - Sprint Planning - Oct 7, 2024.json`

### Main Dataset File
- Pattern: `{user-name}-{descriptor}-{timeframe}.json`
- Example: `jack-realistic-workspace-data-october-2024.json`

## Main Dataset File Structure

The main dataset file should follow this JSON structure:

```json
{
  "metadata": {
    "userId": "user@company.com",
    "dateRange": {
      "start": "2024-10-01T00:00:00Z",
      "end": "2024-10-31T23:59:59Z"
    },
    "dataSource": "Google Workspace APIs",
    "generatedAt": "2025-08-11T17:30:00Z",
    "notes": "Description of dataset and narrative arc"
  },
  "weeks": {
    "week40": {
      "weekNumber": 40,
      "year": 2024,
      "startDate": "2024-10-01",
      "endDate": "2024-10-04",
      "calendarEvents": [
        // Google Calendar API v3 events
      ],
      "meetTranscripts": [
        // References to transcript files
      ],
      "googleDocs": [
        // References to document files
      ]
    }
  }
}
```

## File Organization Principles

### Separation of Concerns
- **Calendar events**: Schedule and meeting metadata
- **Transcripts**: Conversation content and dialogue
- **Documents**: Structured summaries and notes
- **Main file**: Timeline coordination and cross-references

### Scalability
- Individual files remain manageable in size
- Easy to add/remove specific meetings
- Clear separation allows for targeted updates
- References between files maintain relationships

### Discoverability
- Consistent naming allows for predictable file locations
- Date-based organization enables chronological browsing
- Meeting type identification helps with content filtering

## Cross-File References

### In Main Dataset File
Reference external files with relative paths:

```json
{
  "transcriptFile": "meet-transcripts/week42-oct15-1on1-sarah-jack.json",
  "documentFile": "google-docs/Meeting Notes - 1on1 Sarah & Jack - Oct 15, 2024.json"
}
```

### Conference ID Consistency
Maintain consistent conference IDs across related files:

- Calendar event: `conferenceId: "meet-1on1-sarah-jack-weekly-oct15"`
- Meet transcript: `name: "conferenceRecords/meet-1on1-sarah-jack-weekly-oct15"`
- Google Doc: Document title includes same participants and date

## Version Control Considerations

### Atomic Changes
- Individual meeting files can be updated independently
- Main dataset file coordinates overall timeline
- Changes to narrative arc require coordinated updates

### Documentation
- Include generation date in metadata
- Document any manual edits or customizations
- Track data source and version information

## Quality Assurance Structure

### File Validation
Each file type should include:
- **Required fields**: All mandatory API fields present
- **Consistent IDs**: Cross-references resolve correctly
- **Valid timestamps**: Chronological order maintained
- **Realistic content**: Conversations sound authentic

### Dataset Validation  
Overall dataset should ensure:
- **Timeline coherence**: Events progress logically
- **Character consistency**: Behavioral patterns maintained
- **API compliance**: All responses match official formats
- **Narrative flow**: Story arc develops authentically

## Storage and Backup

### Git Management
- Include all files in version control
- Use `.gitignore` for generated temp files
- Document any large file considerations

### File Size Guidelines
- Individual transcript files: < 100KB typical
- Google Docs files: < 50KB typical
- Calendar events: < 10KB typical
- Main dataset file: < 500KB typical

### Archive Strategy
- Older datasets can be moved to archive directories
- Maintain reference documentation for archived data
- Consider compression for long-term storage

## Documentation Requirements

Each dataset directory should include:

### README.md
```markdown
# Jack Thompson October 2024 Dataset

**Narrative**: Senior engineer struggling with JWT authentication project, showing analysis paralysis and recovery through team support.

**Timeline**: October 1-31, 2024 (4 weeks)
**Key Characters**: Jack Thompson, Sarah Chen (manager), Mike Rodriguez (mentor)
**Technical Focus**: JWT authentication, Redis integration, team collaboration

## Files
- `jack-realistic-workspace-data-october-2024.json`: Main timeline
- `meet-transcripts/`: 12 meeting transcripts showing progression
- `google-docs/`: 3 auto-generated meeting summaries
- `calendar-events/`: Individual calendar event files (if separated)
```

### Character Profiles
Document key participants with:
- Role and expertise level
- Communication patterns
- Character development arc
- Technical knowledge areas

### Technical Context
Document the project context:
- Technology stack and challenges
- Business requirements and timeline
- Team structure and dynamics
- Realistic technical problems and solutions

This standardized organization ensures datasets are discoverable, maintainable, and useful for training AI consolidation systems while preserving the authenticity and narrative flow of realistic workplace interactions.