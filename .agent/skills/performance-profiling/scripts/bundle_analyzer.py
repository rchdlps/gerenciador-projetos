#!/usr/bin/env python3
import os
import sys
import subprocess
from pathlib import Path

# ANSI colors
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_step(text):
    print(f"{Colors.BLUE}🔄 {text}{Colors.ENDC}")

def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.ENDC}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.ENDC}")

def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.ENDC}")

def analyze_bundle(project_path):
    print_step("Building project for analysis...")
    
    # Run build
    try:
        # Check if npm or bun or yarn
        cmd = ["npm", "run", "build"]
        process = subprocess.run(
            cmd, 
            cwd=project_path, 
            capture_output=True, 
            text=True,
            check=False
        )
        
        if process.returncode != 0:
            print_error("Build failed:")
            print(process.stderr)
            return False

        print_success("Build completed.")
        
        # Analyze dist folder
        dist_path = Path(project_path) / "dist"
        if not dist_path.exists():
            print_error(f"Dist folder not found at {dist_path}")
            return False
            
        print_step("Scanning bundle sizes...")
        
        large_files = []
        warning_files = []
        
        # Thresholds (in bytes)
        ERROR_THRESHOLD = 500 * 1024  # 500KB
        WARN_THRESHOLD = 200 * 1024   # 200KB
        
        total_size = 0
        
        for root, dirs, files in os.walk(dist_path):
            for file in files:
                if file.endswith('.js') or file.endswith('.css'):
                    file_path = Path(root) / file
                    size = file_path.stat().st_size
                    total_size += size
                    
                    rel_path = file_path.relative_to(project_path)
                    
                    if size > ERROR_THRESHOLD:
                        large_files.append((str(rel_path), size))
                    elif size > WARN_THRESHOLD:
                        warning_files.append((str(rel_path), size))
        
        # Report
        print(f"\nTotal Bundle Size: {total_size / 1024:.2f} KB\n")
        
        if large_files:
            print_error(f"Found {len(large_files)} files exceeding {ERROR_THRESHOLD/1024:.0f}KB:")
            for name, size in large_files:
                print(f"  - {name}: {size/1024:.2f} KB")
        
        if warning_files:
            print_warning(f"Found {len(warning_files)} files exceeding {WARN_THRESHOLD/1024:.0f}KB:")
            for name, size in warning_files:
                print(f"  - {name}: {size/1024:.2f} KB")
                
        if not large_files and not warning_files:
            print_success("All bundle files are within size limits.")
            return True
        elif large_files:
            return False
        else:
            print_success("Bundle analysis passed (with warnings).")
            return True
            
    except Exception as e:
        print_error(f"Analysis failed: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: bundle_analyzer.py <project_path>")
        sys.exit(1)
        
    project_path = sys.argv[1]
    success = analyze_bundle(project_path)
    sys.exit(0 if success else 1)
