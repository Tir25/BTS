# System Flowcharts

## Overview

This document contains detailed flowcharts for the University Bus Tracking System, showing user interactions, data flow, authentication processes, and system operations.

## 1. User Authentication Flow

```mermaid
flowchart TD
    A[User Opens Application] --> B{User Type?}
    B -->|Student| C[Student Login Page]
    B -->|Driver| D[Driver Login Page]
    B -->|Admin| E[Admin Login Page]
    
    C --> F[Enter Email & Password]
    D --> F
    E --> F
    
    F --> G[Validate Credentials]
    G --> H{Valid?}
    H -->|No| I[Show Error Message]
    I --> F
    
    H -->|Yes| J[Generate JWT Token]
    J --> K[Store Token in Local Storage]
    K --> L[Redirect to Dashboard]
    
    L --> M{User Role?}
    M -->|Student| N[Student Dashboard]
    M -->|Driver| O[Driver Dashboard]
    M -->|Admin| P[Admin Dashboard]
    
    N --> Q[View Bus Locations]
    O --> R[Share Location]
    P --> S[Manage System]
```

## 2. Real-Time Location Tracking Flow

```mermaid
flowchart TD
    A[Driver App Starts] --> B[Request Location Permission]
    B --> C{Permission Granted?}
    C -->|No| D[Show Permission Error]
    C -->|Yes| E[Start GPS Tracking]
    
    E --> F[Capture GPS Coordinates]
    F --> G[Add Timestamp & Speed]
    G --> H[Send to Backend API]
    
    H --> I[Validate Location Data]
    I --> J{Valid?}
    J -->|No| K[Return Error]
    J -->|Yes| L[Store in Database]
    
    L --> M[Update Live Locations Table]
    M --> N[Broadcast via WebSocket]
    N --> O[Send to Connected Clients]
    
    O --> P[Student Apps Receive Update]
    O --> Q[Admin Dashboard Updates]
    O --> R[Map Components Refresh]
    
    P --> S[Update Bus Marker on Map]
    Q --> T[Update Analytics]
    R --> U[Show Real-time Position]
    
    S --> V[Calculate ETA]
    T --> W[Update Statistics]
    U --> X[Display Bus Info]
```

## 3. Bus Management Flow (Admin)

```mermaid
flowchart TD
    A[Admin Logs In] --> B[Access Admin Dashboard]
    B --> C[View Bus Management]
    C --> D{Action?}
    
    D -->|Add Bus| E[Open Add Bus Form]
    D -->|Edit Bus| F[Select Bus to Edit]
    D -->|Delete Bus| G[Select Bus to Delete]
    D -->|View Details| H[View Bus Information]
    
    E --> I[Fill Bus Details]
    I --> J[Upload Bus Image]
    J --> K[Assign Driver]
    K --> L[Assign Route]
    L --> M[Save Bus Data]
    
    F --> N[Load Bus Data]
    N --> O[Modify Details]
    O --> P[Update Database]
    
    G --> Q[Confirm Deletion]
    Q --> R{Confirmed?}
    R -->|No| C
    R -->|Yes| S[Delete from Database]
    
    H --> T[Display Bus Info]
    T --> U[Show Location History]
    U --> V[Display Analytics]
    
    M --> W[Update Bus List]
    P --> W
    S --> W
    W --> C
```

## 4. Route Management Flow

```mermaid
flowchart TD
    A[Admin Access Route Management] --> B{Action?}
    
    B -->|Create Route| C[Open Route Creation Form]
    B -->|Edit Route| D[Select Existing Route]
    B -->|Delete Route| E[Select Route to Delete]
    B -->|View Route| F[Display Route Details]
    
    C --> G[Enter Route Name]
    G --> H[Add Description]
    H --> I[Draw Route on Map]
    I --> J[Set Stops/Coordinates]
    J --> K[Calculate Distance]
    K --> L[Set Duration]
    L --> M[Upload Route Map]
    M --> N[Save Route]
    
    D --> O[Load Route Data]
    O --> P[Modify Route Details]
    P --> Q[Update Route Path]
    Q --> R[Save Changes]
    
    E --> S[Confirm Route Deletion]
    S --> T{Confirmed?}
    T -->|No| B
    T -->|Yes| U[Delete Route]
    
    F --> V[Show Route on Map]
    V --> W[Display Bus Assignments]
    W --> X[Show Route Statistics]
    
    N --> Y[Update Route List]
    R --> Y
    U --> Y
    Y --> B
```

## 5. File Upload Flow

```mermaid
flowchart TD
    A[User Selects File] --> B[Choose File Type]
    B --> C{File Type?}
    
    C -->|Image| D[Image Upload Form]
    C -->|Document| E[Document Upload Form]
    
    D --> F[Select Image File]
    E --> G[Select Document File]
    
    F --> H[Validate File Size]
    G --> H
    
    H --> I{Size Valid?}
    I -->|No| J[Show Size Error]
    I -->|Yes| K[Validate File Format]
    
    J --> F
    K --> L{Format Valid?}
    L -->|No| M[Show Format Error]
    L -->|Yes| N[Upload to Supabase Storage]
    
    M --> F
    N --> O[Generate Public URL]
    O --> P[Store URL in Database]
    P --> Q[Return Success Response]
    
    Q --> R[Update UI]
    R --> S[Display Uploaded File]
```

## 6. WebSocket Communication Flow

```mermaid
flowchart TD
    A[Client Connects] --> B[Establish WebSocket Connection]
    B --> C[Send Authentication Token]
    C --> D[Validate Token]
    D --> E{Valid Token?}
    
    E -->|No| F[Close Connection]
    E -->|Yes| G[Authenticate User]
    
    G --> H[Join User Room]
    H --> I[Subscribe to Events]
    
    I --> J{Event Type?}
    J -->|Location Update| K[Receive Location Data]
    J -->|Bus Status| L[Receive Status Change]
    J -->|Route Update| M[Receive Route Change]
    J -->|System Alert| N[Receive Alert]
    
    K --> O[Update Map Marker]
    L --> P[Update Bus Status]
    M --> Q[Update Route Display]
    N --> R[Show Notification]
    
    O --> S[Calculate ETA]
    P --> T[Update UI Elements]
    Q --> U[Refresh Route Info]
    R --> V[Display Alert Message]
    
    S --> W[Update ETA Display]
    T --> X[Refresh Dashboard]
    U --> Y[Update Navigation]
    V --> Z[Log Alert Event]
```

## 7. Error Handling Flow

```mermaid
flowchart TD
    A[System Operation] --> B{Operation Success?}
    
    B -->|Yes| C[Continue Normal Flow]
    B -->|No| D[Capture Error Details]
    
    D --> E[Log Error]
    E --> F[Determine Error Type]
    
    F --> G{Error Category?}
    G -->|Authentication| H[Redirect to Login]
    G -->|Validation| I[Show Validation Error]
    G -->|Network| J[Show Network Error]
    G -->|Database| K[Show Database Error]
    G -->|System| L[Show System Error]
    
    H --> M[Clear User Session]
    I --> N[Highlight Invalid Fields]
    J --> O[Show Retry Option]
    K --> P[Show Contact Support]
    L --> Q[Show Error Details]
    
    M --> R[Return to Login Page]
    N --> S[Allow User Correction]
    O --> T[Retry Operation]
    P --> U[Provide Support Info]
    Q --> V[Log for Debugging]
    
    R --> W[User Re-authenticates]
    S --> X[User Fixes Input]
    T --> A
    U --> Y[User Contacts Support]
    V --> Z[Developer Investigation]
```

## 8. Data Synchronization Flow

```mermaid
flowchart TD
    A[Application Starts] --> B[Check Network Status]
    B --> C{Online?}
    
    C -->|No| D[Load Cached Data]
    C -->|Yes| E[Sync with Server]
    
    D --> F[Show Offline Mode]
    E --> G[Fetch Latest Data]
    
    F --> H[Queue Updates]
    G --> I[Update Local Cache]
    
    H --> J[Monitor Network]
    I --> K[Update UI]
    
    J --> L{Network Restored?}
    L -->|No| J
    L -->|Yes| M[Send Queued Updates]
    
    K --> N[Display Current Data]
    M --> O[Confirm Sync Success]
    
    N --> P[User Interaction]
    O --> Q[Clear Queue]
    
    P --> R[Process User Action]
    Q --> S[Update Local Data]
    
    R --> T[Send to Server]
    S --> U[Update Cache]
    
    T --> V[Receive Response]
    U --> P
    
    V --> W{Success?}
    W -->|Yes| X[Update UI]
    W -->|No| Y[Handle Error]
    
    X --> P
    Y --> Z[Show Error Message]
    Z --> P
```

## 9. Analytics and Reporting Flow

```mermaid
flowchart TD
    A[Admin Access Analytics] --> B[Select Report Type]
    
    B --> C{Report Category?}
    C -->|Bus Usage| D[Bus Usage Analytics]
    C -->|Route Performance| E[Route Performance Report]
    C -->|Driver Activity| F[Driver Activity Report]
    C -->|System Health| G[System Health Report]
    
    D --> H[Query Bus Data]
    E --> I[Query Route Data]
    F --> J[Query Driver Data]
    G --> K[Query System Metrics]
    
    H --> L[Calculate Usage Statistics]
    I --> M[Calculate Performance Metrics]
    J --> N[Calculate Activity Metrics]
    K --> O[Calculate Health Metrics]
    
    L --> P[Generate Charts]
    M --> Q[Generate Route Maps]
    N --> R[Generate Activity Timeline]
    O --> S[Generate Health Dashboard]
    
    P --> T[Display Bus Usage Report]
    Q --> U[Display Route Performance]
    R --> V[Display Driver Activity]
    S --> W[Display System Health]
    
    T --> X[Export Report]
    U --> X
    V --> X
    W --> X
    
    X --> Y{Export Format?}
    Y -->|PDF| Z[Generate PDF Report]
    Y -->|Excel| AA[Generate Excel Report]
    Y -->|CSV| BB[Generate CSV Report]
    
    Z --> CC[Download Report]
    AA --> CC
    BB --> CC
```

## 10. Security and Access Control Flow

```mermaid
flowchart TD
    A[User Request] --> B[Check Authentication]
    B --> C{Authenticated?}
    
    C -->|No| D[Return 401 Unauthorized]
    C -->|Yes| E[Validate JWT Token]
    
    E --> F{Valid Token?}
    F -->|No| G[Return 401 Unauthorized]
    F -->|Yes| H[Extract User Role]
    
    H --> I[Check Route Permission]
    I --> J{Has Permission?}
    
    J -->|No| K[Return 403 Forbidden]
    J -->|Yes| L[Check Rate Limit]
    
    L --> M{Within Limits?}
    M -->|No| N[Return 429 Too Many Requests]
    M -->|Yes| O[Process Request]
    
    O --> P[Validate Input Data]
    P --> Q{Input Valid?}
    
    Q -->|No| R[Return 400 Bad Request]
    Q -->|Yes| S[Execute Business Logic]
    
    S --> T[Log Activity]
    T --> U[Return Response]
    
    D --> V[Redirect to Login]
    G --> V
    K --> W[Show Access Denied]
    N --> X[Show Rate Limit Message]
    R --> Y[Show Validation Errors]
    
    V --> Z[User Re-authenticates]
    W --> AA[User Requests Access]
    X --> BB[User Waits]
    Y --> CC[User Fixes Input]
    
    Z --> A
    AA --> DD[Admin Grants Access]
    BB --> A
    CC --> A
    DD --> A
```

These flowcharts provide a comprehensive view of how the University Bus Tracking System operates, from user authentication to real-time data processing and system management.
