# 📋 Configuration Setup Guide

## ⚠️ IMPORTANT: Before Running the Application

This application requires a `config.php` file that contains sensitive credentials. This file is **NOT included in the repository** for security reasons.

---

## 🚀 Quick Setup

### Step 1: Create config.php

Copy the example file to create your configuration:

```bash
# Windows (Command Prompt)
copy config.example.php config.php

# Windows (PowerShell)
Copy-Item config.example.php config.php

# Linux/Mac
cp config.example.php config.php
```

### Step 2: Edit config.php

Open `config.php` and update the following:

```php
// Line 43: Replace with your actual Groq API Key
define('GROQ_API_KEY', getConfig('GROQ_API_KEY', 'gsk_YOUR_ACTUAL_KEY_HERE'));
```

### Step 3: Get a Groq API Key

1. Go to [Groq Cloud Console](https://console.groq.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `gsk_`)

---

## 📁 Required Files Structure

```
config/
├── config.example.php  ← Template (committed to git)
├── config.php          ← YOUR CONFIG (NOT committed, in .gitignore)
├── database.php        ← Database connection
└── README.md           ← This file
```

---

## 🔧 Configuration Variables

### GROQ_API_KEY (Required)
- **What**: API key for Groq AI service
- **Where to get**: https://console.groq.com/
- **Format**: `gsk_xxxxxxxxxxxxxxxxxxxx`

### Database Credentials
Database settings are in `database.php`:
- Host: `localhost` (default for XAMPP)
- Database: `sigap_ppkpt`
- Username: `root`
- Password: `` (empty for XAMPP default)

---

## 🔒 Security Notes

1. **NEVER commit `config.php`** - It contains your API key
2. The `.gitignore` file is configured to ignore `config.php`
3. For production, use environment variables instead of hardcoding

### Using Environment Variables (Recommended for Production)

```bash
# Set environment variable
export GROQ_API_KEY="gsk_your_key_here"

# The config.php will automatically use it via getConfig()
```

---

## ❌ Troubleshooting

### Error: "GROQ_API_KEY not configured"
- Make sure `config.php` exists
- Check that you replaced `YOUR_API_KEY_HERE` with actual key

### Error: "Failed to load dependencies"
- Ensure `config.php` is in the `config/` directory
- Check file permissions (readable by web server)

### Error: "Database connection failed"
- Verify MySQL is running (XAMPP Control Panel)
- Check credentials in `database.php`
- Ensure database `sigap_ppkpt` exists

---

## 📞 Support

If you encounter issues:
1. Check the logs at `api/logs/chat_error.log`
2. Verify all config files are in place
3. Test database connection separately
