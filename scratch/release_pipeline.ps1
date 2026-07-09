# release_pipeline.ps1
# Automates the ISMS compliance Git branching flow:
# 1. Start Feature: dev -> feat/name
# 2. Merge Feature to Dev & Run QA Regression Checks
# 3. Release Dev to Main (triggering GitHub Actions CI Firefox testing)

param (
    [Parameter(Mandatory=$false)]
    [string]$Action,

    [Parameter(Mandatory=$false)]
    [string]$BranchName
)

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Lekha Git Release Pipeline & Compliance Orchestrator" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# Helper to check command status
function Check-LastCommand {
    param($ErrorMessage)
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error: $ErrorMessage" -ForegroundColor Red
        Exit 1
    }
}

# Determine action interactively if not provided
if (-not $Action) {
    Write-Host "Please select a workflow action:"
    Write-Host "1) Start a new Feature branch (from dev)"
    Write-Host "2) Merge Feature branch to dev & execute QA validation tests"
    Write-Host "3) Release dev branch to main (pushes to production CI)"
    Write-Host "-----------------------------------------------------------------"
    $choice = Read-Host "Enter option (1-3)"
    
    if ($choice -eq "1") { $Action = "start-feature" }
    elseif ($choice -eq "2") { $Action = "merge-feature" }
    elseif ($choice -eq "3") { $Action = "release-main" }
    else {
        Write-Host "Invalid choice. Exiting." -ForegroundColor Red
        Exit 1
    }
}

switch ($Action) {
    "start-feature" {
        if (-not $BranchName) {
            $BranchName = Read-Host "Enter new feature name (e.g. chatbot-enhancement)"
        }
        $featBranch = "feat/$BranchName"
        
        Write-Host "Switching to 'dev' branch..." -ForegroundColor Yellow
        git checkout dev 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "'dev' branch does not exist locally. Creating it..." -ForegroundColor Yellow
            git checkout -b dev
        }
        
        Write-Host "Pulling latest changes from remote 'dev'..." -ForegroundColor Yellow
        git pull origin dev 2>$null
        
        Write-Host "Creating and checking out feature branch '$featBranch'..." -ForegroundColor Yellow
        git checkout -b $featBranch
        Check-LastCommand "Failed to create feature branch."
        
        Write-Host "✔ Feature branch '$featBranch' successfully initialized! Start coding." -ForegroundColor Green
    }

    "merge-feature" {
        if (-not $BranchName) {
            $BranchName = Read-Host "Enter feature name to merge (e.g. chatbot-enhancement)"
        }
        $featBranch = "feat/$BranchName"
        
        Write-Host "Switching to 'dev' branch..." -ForegroundColor Yellow
        git checkout dev
        Check-LastCommand "Failed to checkout dev branch."
        
        Write-Host "Merging '$featBranch' into 'dev'..." -ForegroundColor Yellow
        git merge $featBranch --no-edit
        Check-LastCommand "Merge conflict detected. Please resolve conflicts manually."

        # Execute QA Integration tests
        Write-Host "-----------------------------------------------------------------" -ForegroundColor Yellow
        Write-Host " Running local QA Regression Test Suite..." -ForegroundColor Yellow
        Write-Host "-----------------------------------------------------------------" -ForegroundColor Yellow
        
        # Seed DB
        Push-Location backend
        Write-Host "Resetting test database..."
        npm run db:seed
        if ($LASTEXITCODE -ne 0) {
            Pop-Location
            Check-LastCommand "Database seeding failed. Aborting push."
        }
        
        # Run Integration QA Script
        Write-Host "Running 44-point positive & negative checks..."
        node C:\Users\omkar.s\.gemini\antigravity-cli\brain\d9d2d343-a7d6-42bb-ad28-5327b71208b1\scratch\exhaustive_qa_test.js
        if ($LASTEXITCODE -ne 0) {
            Pop-Location
            Check-LastCommand "QA regression tests failed! Fix issues before pushing."
        }
        Pop-Location

        # Seeding reset to normal default seeds
        Push-Location backend
        npm run db:seed
        Pop-Location
        
        Write-Host "✔ QA checks passed! Pushing 'dev' branch to GitHub..." -ForegroundColor Green
        git push origin dev
        Check-LastCommand "Failed to push dev branch."
        Write-Host "✔ 'dev' branch successfully updated and pushed!" -ForegroundColor Green
    }

    "release-main" {
        Write-Host "Switching to 'main' branch..." -ForegroundColor Yellow
        git checkout main
        Check-LastCommand "Failed to checkout main branch."
        
        Write-Host "Pulling latest changes from remote 'main'..." -ForegroundColor Yellow
        git pull origin main
        
        Write-Host "Merging 'dev' into 'main'..." -ForegroundColor Yellow
        git merge dev --no-edit
        Check-LastCommand "Merge conflicts between dev and main detected."
        
        Write-Host "Pushing 'main' branch to production repository..." -ForegroundColor Yellow
        git push origin main
        Check-LastCommand "Failed to push main branch."
        
        Write-Host "✔ 'main' branch successfully pushed! GitHub Actions pipeline triggered." -ForegroundColor Green
        Write-Host "✔ Functional tests on Linux VM & Mozilla Firefox starting in CI." -ForegroundColor Green
    }
}
