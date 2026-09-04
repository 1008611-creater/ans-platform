# StoReel Canvas workflow

## Login

1. Open `https://canvas.storeel.vip/login/`.
2. Fill email and password.
3. Check the service/privacy checkbox.
4. Submit login.
5. Confirm redirect to `https://canvas.storeel.vip/`.

## Project Entry

1. After login, use the top-right/home navigation create entry.
2. In the new-project modal, enter any reasonable project name unless the user specified one.
3. Confirm creation with the exact create button inside the modal.
4. On the mode-selection page, choose the second mode: free canvas mode.
5. Confirm the project URL pattern `/canvas/project/<uuid>`.

## Canvas Page

Known visible controls:

- Back to home.
- Project list.
- Left text area for script input.
- Image/video upload control.
- Generation history.
- Asset library.
- Five-step workflow:
  - input or upload script.
  - break down storyboard script and asset library.
  - review storyboard and asset prompts, then generate asset images.
  - review asset image quality, then generate Seedance2 storyboard prompts.
  - generate storyboard videos.

## Use Rule

Use this route as the single approved Seedance2 website path for this thread unless the user explicitly provides a replacement channel.
