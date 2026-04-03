# Excel Import Format - Asset Upload Guide

**Last Updated:** April 1, 2026
**For:** Admins importing assets into the CIT Facility Survey App

---

## 📋 Quick Summary

**Purpose:** Import assets from Excel files to populate the asset register for survey creation.

**File Type:** `.xlsx` or `.xls` (Excel format)

**Max File Size:** 10 MB

**Max Assets:** 1,000,000 (unlimited for practical purposes)

---

## 📊 Required Excel Structure

### **Sheet Names** (Case-Insensitive)

Your Excel file **MUST** contain one or more of these sheet names:

| Sheet Name | Purpose | Example Assets |
|------------|---------|----------------|
| **MECHANICAL** | Mechanical systems | Pumps, Motors, Generators, Elevators |
| **FLS** | Fire & Life Safety | Fire Alarms, Sprinklers, Extinguishers |
| **ELECTRICAL** | Electrical systems | Panels, Transformers, UPS, Lighting |
| **CIVIL** | Civil/Structural | Building structure, foundations |
| **PLUMBING** | Plumbing systems | Pipes, Valves, Water Heaters |
| **HVAC** | HVAC systems | AC Units, Chillers, Air Handlers |

**❌ Sheets with other names will be IGNORED**

---

## 📝 Required Column Headers

### **Column Mapping Table**

| Excel Column Header | Database Field | Required | Description | Example |
|---------------------|----------------|----------|-------------|---------|
| **Asset Code** | `ref_code` | ✅ Yes | Unique reference code for the asset | "HVAC-001", "P-125" |
| **Asset Description** | `name` | ✅ Yes | Name/description of the asset | "Rooftop AC Unit", "Main Water Pump" |
| **Asset System** | `service_line` | ✅ Yes | Service line/trade category | "HVAC", "Plumbing", "Electrical" |
| **Asset Status** | `status` | No | Operational status | "Active", "Inactive", "Decommissioned" |
| **Asset Tag** | `asset_tag` | No | Physical tag number on asset | "TAG-12345" |
| **Zone** | `zone` | No | Zone or area designation | "Zone A", "North Wing" |
| **Building** | `building` | No | Building name or code | "Main Building", "Building A", "Tower 2" |
| **Location** | `location` | No | Specific location within building | "2nd Floor", "Rooftop", "Basement" |

---

## 🔍 Column Header Matching Rules

**Case-Insensitive:** Column headers are matched case-insensitively
- `Asset Code` = `asset code` = `ASSET CODE` ✅

**Exact Match Required:** Headers must match exactly (after trimming whitespace)
- `Asset Code` ✅
- `Asset  Code` (extra space) ❌
- `AssetCode` (no space) ❌
- `Code` (missing "Asset") ❌

**Column Order:** Doesn't matter - columns can be in any order

---

## 📄 Excel Template Example

### **Sheet: HVAC**

| Asset Code | Asset Description | Asset System | Asset Status | Asset Tag | Zone | Building | Location |
|------------|-------------------|--------------|--------------|-----------|------|----------|----------|
| HVAC-001 | Rooftop AC Unit #1 | HVAC | Active | TAG-1001 | Zone A | Main Building | Rooftop |
| HVAC-002 | Rooftop AC Unit #2 | HVAC | Active | TAG-1002 | Zone A | Main Building | Rooftop |
| HVAC-003 | Chiller #1 | HVAC | Active | TAG-1003 | Zone B | Main Building | Basement |
| HVAC-004 | Air Handler - Floor 2 | HVAC | Active | TAG-1004 | Zone A | Main Building | 2nd Floor |

### **Sheet: PLUMBING**

| Asset Code | Asset Description | Asset System | Asset Status | Asset Tag | Zone | Building | Location |
|------------|-------------------|--------------|--------------|-----------|------|----------|----------|
| P-001 | Main Water Pump | Plumbing | Active | TAG-2001 | Zone C | Main Building | Basement |
| P-002 | Hot Water Heater #1 | Plumbing | Active | TAG-2002 | Zone C | Main Building | Basement |
| P-003 | Sump Pump | Plumbing | Active | TAG-2003 | Zone C | Main Building | Basement |

### **Sheet: ELECTRICAL**

| Asset Code | Asset Description | Asset System | Asset Status | Asset Tag | Zone | Building | Location |
|------------|-------------------|--------------|--------------|-----------|------|----------|----------|
| E-001 | Main Distribution Panel | Electrical | Active | TAG-3001 | Zone D | Main Building | Electrical Room |
| E-002 | UPS System | Electrical | Active | TAG-3002 | Zone D | Main Building | Server Room |
| E-003 | Generator | Electrical | Active | TAG-3003 | Zone E | Outdoor | Generator Yard |

---

## ✅ Validation Rules

### **1. Required Fields**

If **Asset Code**, **Asset Description**, or **Asset System** is missing, the row will still be imported with defaults:

- **Missing Asset Code:** Empty string `""`
- **Missing Asset Description:** `"Unknown Asset"`
- **Missing Asset System:** `"General"`

### **2. Optional Fields**

If optional fields are missing:
- **Asset Status:** Defaults to `"Active"`
- **Asset Tag:** Empty string `""`
- **Zone:** Empty string `""`
- **Building:** Empty string `""`
- **Location:** Empty string `""`

### **3. Data Types**

All fields are treated as **text/string** - no numeric or date validation.

### **4. Duplicate Handling**

- **No duplicate checking** - duplicate Asset Codes are allowed
- Each row is imported as a separate asset
- If you upload the same file twice, assets will be duplicated

---

## 🚀 Import Process

### **Step-by-Step Guide**

1. **Prepare Excel File**
   - Create sheets: MECHANICAL, FLS, ELECTRICAL, CIVIL, PLUMBING, HVAC (use only the ones you need)
   - Add column headers (exact spelling from table above)
   - Fill in asset data
   - Save as `.xlsx` or `.xls`

2. **Navigate to Survey Management**
   - Login as **Admin**
   - Go to **Survey Management** tab
   - Select the **Site** you want to upload assets to

3. **Upload File**
   - Tap **"Import Assets"** button
   - Select your Excel file
   - Wait for upload and processing

4. **Review Results**
   - Success message shows: `"Import successful: 125 assets imported"`
   - Breakdown by sheet: `HVAC: 45, Plumbing: 32, Electrical: 48`
   - If errors occur, you'll see specific error messages

---

## ⚠️ Common Errors & Solutions

### **Error: "No file uploaded"**
**Cause:** File not selected or upload interrupted
**Fix:** Try again, ensure file is selected before tapping Upload

### **Error: "Site ID is required"**
**Cause:** No site selected before upload
**Fix:** Select a site from the dropdown first, then upload

### **Error: "Only Excel files (.xlsx, .xls) are allowed"**
**Cause:** Wrong file type (e.g., .csv, .txt, .pdf)
**Fix:** Save file as Excel format (.xlsx) and try again

### **Error: "No valid assets found in allowed sheets"**
**Cause:** Sheet names don't match allowed list OR sheets are empty
**Fix:**
- Rename sheets to: MECHANICAL, FLS, ELECTRICAL, CIVIL, PLUMBING, or HVAC
- Ensure sheets have data rows (not just headers)

### **Error: "Failed to process Excel file"**
**Cause:** Corrupted file, server error, or database issue
**Fix:**
- Re-save Excel file and try again
- Check file size (must be < 10 MB)
- Contact admin if persists

---

## 💡 Best Practices

### **1. Data Quality**

✅ **DO:**
- Use consistent naming conventions (e.g., "HVAC-001", "HVAC-002")
- Fill in all optional fields for better organization
- Use meaningful Asset Descriptions ("Rooftop AC Unit #1" not "AC1")
- Keep Asset Codes unique to avoid confusion
- Use consistent Building names across all rows

❌ **DON'T:**
- Leave Asset Description empty (defaults to "Unknown Asset")
- Use special characters in Asset Codes that might cause confusion
- Mix naming conventions (e.g., "hvac-001" and "HVAC_002")

### **2. File Organization**

✅ **DO:**
- Organize assets by service line (one sheet per trade)
- Sort rows logically (by building, then floor, then room)
- Remove empty rows between data
- Use the template provided below

❌ **DON'T:**
- Put all assets in one sheet (use trade-specific sheets)
- Include merged cells or complex formatting
- Add extra header rows or summary rows

### **3. Pre-Upload Checklist**

- [ ] File saved as `.xlsx` or `.xls`
- [ ] Sheet names are one of: MECHANICAL, FLS, ELECTRICAL, CIVIL, PLUMBING, HVAC
- [ ] Column headers match exactly (case-insensitive): Asset Code, Asset Description, Asset System, etc.
- [ ] All required fields filled (Asset Code, Asset Description, Asset System)
- [ ] File size < 10 MB
- [ ] No empty sheets
- [ ] Site selected in Survey Management before upload

---

## 📥 Download Template

### **Excel Template File**

A ready-to-use Excel template is available:

**File:** `Asset_Import_Template.xlsx`

**Location:**
- Web: Profile → How to Use → Search "Excel" → Download link
- Or request from your admin

**Template Structure:**
```
Asset_Import_Template.xlsx
├─ MECHANICAL (sample data)
├─ FLS (sample data)
├─ ELECTRICAL (sample data)
├─ CIVIL (empty)
├─ PLUMBING (sample data)
└─ HVAC (sample data)
```

**Instructions:**
1. Download template
2. Delete sample data rows (keep headers!)
3. Fill in your asset data
4. Save and upload

---

## 🔧 Advanced Usage

### **Bulk Updates**

**Scenario:** You need to update 500 assets with new building names

**Solution:**
1. Export current assets (if available - future feature)
2. Modify Excel file
3. Delete all assets for the site (Survey Management → Delete All)
4. Re-import updated Excel file

⚠️ **WARNING:** This will delete all surveys for that site. Use with caution.

### **Multi-Site Upload**

**Scenario:** You have 5 sites with different assets

**Solution:**
1. Create 5 separate Excel files (one per site)
2. For each site:
   - Select site in Survey Management
   - Upload corresponding Excel file
3. Repeat for all sites

**OR:**

Use the same Excel file for all sites if assets are similar:
- Select Site A → Upload Excel
- Select Site B → Upload same Excel (assets duplicated for Site B)

---

## 📊 Import Performance

| Asset Count | Import Time | Notes |
|-------------|-------------|-------|
| 10 assets | < 1 second | Instant |
| 100 assets | 1-2 seconds | Fast |
| 1,000 assets | 3-5 seconds | Quick |
| 10,000 assets | 30-60 seconds | Acceptable |
| 100,000+ assets | 5-10 minutes | Bulk import uses optimized SQL |

**Optimization:** The import uses PostgreSQL's `UNNEST` function for bulk inserts, making it **10-100x faster** than individual INSERT statements.

---

## 🔍 Troubleshooting

### **Import Success but Assets Not Showing**

**Possible Causes:**
1. **Wrong site selected:** Check that you selected the correct site before upload
2. **Sync issue (mobile):** Trigger manual sync: Profile → Sync Data
3. **Browser cache:** Refresh page (F5 or Cmd+R)

**Fix:**
- Go to Assets screen
- Filter by site
- If still missing, re-upload

### **Some Assets Missing After Import**

**Possible Causes:**
1. **Sheet name mismatch:** Only MECHANICAL, FLS, ELECTRICAL, CIVIL, PLUMBING, HVAC are processed
2. **Empty rows:** Rows with ALL empty cells are skipped
3. **Hidden sheets:** Ensure sheet is visible (not hidden)

**Fix:**
- Check import summary: `HVAC: 45, Plumbing: 32` - which sheets were processed?
- Unhide any hidden sheets
- Verify sheet names match allowed list

### **Import Takes Too Long**

**Possible Causes:**
1. **Large file (> 5 MB):** Too many assets or large Excel file
2. **Server load:** Backend is processing other requests
3. **Network slow:** Upload speed limited

**Fix:**
- Split into smaller files (e.g., 10,000 assets per file)
- Upload during off-peak hours
- Check internet connection

---

## 📞 Support

**Need Help?**

- **In-App Help:** Profile → How to Use → Search "Excel"
- **Contact Admin:** Your site administrator
- **Technical Support:** IT support team

**Common Questions:**
- "What if I have a different column name?" → You must rename it to match exactly
- "Can I upload CSV files?" → No, only `.xlsx` or `.xls`
- "How do I delete imported assets?" → Survey Management → Select site → Delete All (⚠️ WARNING: Also deletes surveys)

---

## 🎯 Quick Reference Card

### **Minimum Required Excel Structure**

```
Sheet Name: HVAC (or MECHANICAL/FLS/ELECTRICAL/CIVIL/PLUMBING)

| Asset Code | Asset Description | Asset System |
|------------|-------------------|--------------|
| HVAC-001   | Rooftop AC Unit   | HVAC         |
```

### **Full Excel Structure (All Columns)**

```
| Asset Code | Asset Description | Asset System | Asset Status | Asset Tag | Zone | Building | Location |
|------------|-------------------|--------------|--------------|-----------|------|----------|----------|
| HVAC-001   | Rooftop AC Unit   | HVAC         | Active       | TAG-1001  | A    | Main Bldg| Rooftop  |
```

### **Import Checklist**

- [ ] File: `.xlsx` or `.xls`
- [ ] Sheet: MECHANICAL, FLS, ELECTRICAL, CIVIL, PLUMBING, or HVAC
- [ ] Headers: Asset Code, Asset Description, Asset System (minimum)
- [ ] Site: Selected in Survey Management
- [ ] Size: < 10 MB

---

**Last Updated:** April 1, 2026
**Version:** 1.0
**Status:** ✅ Production Ready
