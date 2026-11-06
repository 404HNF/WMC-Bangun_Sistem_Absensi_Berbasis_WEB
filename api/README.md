# API Reference

All endpoints return `{ "success": boolean, "message": string, "data": ... }`.
Admin endpoints require an authenticated PHP session. All writes use POST.

| File | Action | Method | Main purpose |
|---|---|---:|---|
| auth.php | login | POST | Authenticate administrator |
| auth.php | check | GET | Return current user profile and timing constants |
| auth.php | logout | POST | End administrator session |
| attendance.php | info | GET | Current server time and active-session count |
| attendance.php | submit | POST | Validate NIM/code and record attendance |
| dashboard.php | — | GET | Dashboard metrics and recent activity |
| recap.php | filters | GET | Available course/class filters |
| recap.php | sessions | GET | Per-session recap; supports `format=csv` |
| recap.php | students | GET | Per-student recap; supports `format=csv` |
| sessions.php | list | GET | Session list with computed status/counts |
| sessions.php | create | POST | Create a session |
| sessions.php | detail | GET | Session and all registered students' attendance |
| sessions.php | close | POST | Set session end time to now |
| sessions.php | delete | POST | Delete session |
| sessions.php | delete_attendance | POST | Remove one attendance record |
| students.php | list | GET | List students |
| students.php | create/update/delete | POST | Student CRUD |
| users.php | list | GET | List administrator accounts |
| users.php | create/update/delete | POST | Administrator CRUD |

The four-table schema is defined in `database/attendance_db.sql`.
