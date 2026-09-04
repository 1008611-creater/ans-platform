# Migration Policy

Migration solves recurring C-drive growth. It is not routine cleanup.

## Candidate Selection

Good candidates:

- Large app data or cache directories that are not system components.
- Directories with stable ownership by one application.
- Directories that are not databases currently being written.
- Game libraries.
- Docker/WSL storage after app-specific preparation.
- Phone backup roots after user confirmation.

Bad candidates:

- `C:\Windows`
- `C:\Program Files`
- security software engines and databases.
- app directories with services running.
- unknown database directories.
- current agent runtime or session directories.

## Migration Workflow

1. Ask for explicit confirmation for each path.
2. Verify destination drive has enough free space.
3. Ask the user to close the owning app, or skip if it is still running.
4. Copy source to destination.
5. Compare file counts and approximate size.
6. Rename source to `<name>.bak`.
7. Create a junction with `mklink /J`.
8. Verify the junction points to the destination.
9. Ask the user to open the app and confirm it works.
10. Keep `.bak` until the user approves deletion.

## Rollback

If verification fails:

1. Remove the junction.
2. Rename `.bak` back to the original name.
3. Leave the copied destination untouched until the user approves deletion.

## Reporting

Report:

- source path.
- destination path.
- copied size.
- junction status.
- backup path.
- verification result.
