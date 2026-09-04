# Free & Open-Source Disk Cleaning Tools

## Automatic Cleaners

### BleachBit (Top Pick)
- Site: https://www.bleachbit.org/
- Open source (GPLv3), no ads, no upsells
- Cleans 90+ apps: browsers, system temp, logs, thumbnails
- Portable version available (no install needed)
- Has "preview" mode before actual deletion

### CCleaner Free + CCEnhancer
- CCleaner free: https://www.ccleaner.com/
- CCEnhancer: https://singularlabs.com/software/ccenhancer/
- CCEnhancer adds 1000+ extra cleaning rules to free CCleaner
- Note: CCleaner free has ads, avoid Avast bundleware during install

## Disk Space Analyzers

### WizTree (Fastest)
- Site: https://diskanalyzer.com/
- 10-100x faster than WinDirStat (reads NTFS MFT directly)
- Free for personal use, treemap visualization
- Best for quickly finding what's eating your disk

### SpaceSniffer
- Site: https://www.intosoftware.com/
- Portable (no install), real-time treemap
- Hover to see folder sizes, filter by file type/age
- Great for visual exploration

### TreeSize Free
- Site: https://www.jam-software.com/treesize_free
- Tree-structure view, integrates with Explorer right-click menu
- Sort by size to find biggest folders quickly

### Everything (File Search)
- Site: https://www.voidtools.com/
- Instant file search for entire disk
- Search tricks:
  - `size:>500mb` - find files over 500MB
  - `size:>1gb` - find GB-level files
  - `*.log size:>100mb` - find large log files
  - `*.tmp OR *.temp` - find temp files
  - `dm:last2weeks size:>100mb` - recent large files

## Duplicate File Finders

### dupeGuru
- Site: https://dupeguru.voltaicideas.net/
- Open source (GPLv3), fuzzy matching
- Supports picture deduplication mode

### AllDup
- Site: https://alldup.info/
- Free, fast content-based duplicate detection
- Good filtering and preview before deletion

## Built-in Windows Tools

### Disk Cleanup (Enhanced)
```powershell
# Configure all cleanup categories
cleanmgr /d C /sageset:99
# Run with saved config
cleanmgr /d C /sagerun:99
```

### Storage Sense
- Settings > System > Storage > Storage Sense
- Auto-clean temp files, recycle bin, downloads folder
- Configure schedule (daily/weekly/monthly)

### DISM Component Cleanup
```powershell
DISM /Online /Cleanup-Image /StartComponentCleanup /ResetBase
```

### winget uninstall (Remove Bloatware)
```powershell
# List installed apps
winget list
# Uninstall unwanted apps
winget uninstall "AppName"
```
