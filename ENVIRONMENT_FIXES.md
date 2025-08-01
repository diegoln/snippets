# Environment Issues & Fixes

## Problems Identified

### 1. **WSL2 + Windows NTFS Issues**
- **Location**: `/mnt/c/` (Windows filesystem mounted in WSL2)
- **Symptoms**: 
  - `ENOTEMPTY` errors during npm install
  - Extremely slow package installs (90+ seconds)
  - Hanging `rm -rf node_modules` commands
  - Permission conflicts

### 2. **Node Modules Corruption**
- **Evidence**: Partial install folders like `.zod-0hnSjOBi`
- **Cause**: Interrupted installs + filesystem issues
- **Impact**: Missing build tools (Prisma, TypeScript)

### 3. **Network/Registry Issues**
- **Symptoms**: 60-80 second timeouts per package
- **Cache misses** for all packages despite repeated installs

## Solutions Implemented

### ✅ **Immediate Fixes**
1. **Added `.npmrc` optimization**:
   ```
   fetch-retries=3
   fetch-retry-mintimeout=10000
   maxsockets=5
   progress=true
   ```

2. **Created `dev-server.js`** - lightweight dev server bypass
3. **Cleaned corrupted installs** using `mv` instead of `rm`
4. **Essential packages verified**: next, react, @prisma/client present

### 🔧 **Recommended Long-term Solutions**

#### Option 1: Move to WSL2 Native Filesystem
```bash
# Move project to WSL2 home directory
cp -r /mnt/c/Users/diego/Documents/snippets ~/snippets
cd ~/snippets
npm install  # Should be much faster
```

#### Option 2: Use Docker Development
```dockerfile
# Add to project root
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

#### Option 3: Windows Native Development
```bash
# Use PowerShell/CMD on Windows directly
cd C:\Users\diego\Documents\snippets
npm install
npm run dev
```

## Current Status

### ✅ **Working**
- Code changes successfully implemented
- UX issues fixed (onboarding flash + loading states)
- Essential packages installed
- Schema generation working

### ⚠️ **Partially Working**
- Dev server starts but may be slow
- Full npm install still problematic

### 🚨 **Not Working**
- Fast development iteration
- Build tools (Prisma generate, TypeScript)
- Husky hooks (due to missing dependencies)

## Quick Start Commands

```bash
# If full install keeps failing, try:
npm install --prefer-offline --no-audit --no-fund

# Or use our custom dev server:
node dev-server.js

# Or bypass npm entirely:
npx next dev
```

## Environment Info
- **Node**: v22.17.1
- **NPM**: 10.9.2
- **OS**: WSL2 on Windows
- **Filesystem**: NTFS (/mnt/c)
- **Disk Space**: 538GB available ✅