# MindSprint Parent Experience Wireframes

## 1) Parent Dashboard (Unified Child Management)

```text
+--------------------------------------------------------------------------------+
| Parent Dashboard                                       [Add Child] [Logout]    |
| Everything for child setup and progress lives here.                           |
+--------------------------------------------------------------------------------+
| Email: parent@email.com          Subscription: free                            |
+--------------------------------------------------------------------------------+
| Your Children                                                     2 total       |
|--------------------------------------------------------------------------------|
| [🙂] Ava (Grade 3)                                  [Edit Child]                |
| Code 824193                     Progress 72%                                   |
| [Start Learning]                                                           |
|--------------------------------------------------------------------------------|
| [🧠] Liam (Grade 5)                                 [Edit Child]                |
| Code 297661                     Progress 41%                                   |
| [Start Learning]                                                           |
+--------------------------------------------------------------------------------+
| Unlock Student Materials                                                       |
| [ Student access code ............ ] [ Unlock Materials ]                      |
+--------------------------------------------------------------------------------+
```

## 2) Add Child Modal (Inside Dashboard)

```text
+-------------------------------- Add Child -------------------------------------+
| Create a student profile and we will auto-generate the login code.            |
|                                                                                |
| Name    [__________________________]                                           |
| Grade   [__________________________]                                           |
| Avatar  [__] (optional)                                                        |
|                                                                                |
|                                              [Cancel] [Add Child]              |
+--------------------------------------------------------------------------------+
```

## 3) Edit Child Modal (Inside Dashboard)

```text
+------------------------------- Edit Child -------------------------------------+
| Update profile details and keep the same login code.                          |
|                                                                                |
| Name    [__________________________]                                           |
| Grade   [__________________________]                                           |
| Avatar  [__]                                                                   |
| Login code: 824193                                                             |
|                                                                                |
| [Delete]                                             [Cancel] [Save Changes]   |
+--------------------------------------------------------------------------------+
```

## UX Notes
- Mobile-first layout with stacked cards and full-width primary actions.
- Add/Edit flows are in-modal to avoid route changes and page reloads.
- Child actions are in-context (Edit Child, Start Learning, code visibility).
- Progress is shown inline per child for quick scanning.

