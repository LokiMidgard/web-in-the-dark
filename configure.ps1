
Function Touch-File {
    [CmdletBinding()]
    param (
        [Parameter()]
        [System.IO.FileInfo]
        $file
    )
    if ($file -eq $null) {
        throw "No filename supplied"
    }

    if (Test-Path $file) {
        (Get-ChildItem $file).LastWriteTime = Get-Date
    }
    else {
        Write-Output $null > $file
    }
}

function get-singelValue {
    [CmdletBinding()]
    param (
    
        [string[]]$inputObject,
        [string]$pattern
    )
    $x = $inputObject | Select-String $pattern | ForEach-Object { $_.Matches[0].Groups['value'].value }
    if ($null -eq $x) {
        $x = @()
    }
    elseif ($x.GetType().FullName -eq "System.String") {
        $x = @($x )
    }

    if ( $x.length -gt 1) {
        throw "More elements"
    }
    if ($x.length -eq 0) {
        throw "no elements"
    }
    return $x[0]
}


function get-singelValueOrNull {
    [CmdletBinding()]
    param (
    
        [string[]]$inputObject,
        [string]$pattern
    )
    $x = $inputObject | Select-String $pattern | ForEach-Object { $_.Matches[0].Groups['value'].value }
    if ($null -eq $x) {
        $x = @()
    }
    elseif ($x.GetType().FullName -eq "System.String") {
        $x = @($x )
    }

    if ( $x.length -gt 1) {
        throw "More elements"
    }
    if ($x.length -eq 0) {
        return $null
    }
    return $x[0]
}

function get-allValue {
    [CmdletBinding()]
    param (
   
        [string[]]$inputObject,
        [string]$pattern
    )
    $x = $inputObject | Select-String $pattern | ForEach-Object { $_.Matches[0].Groups['value'].value }
    if ($null -eq $x) {
        $x = @()
    }
    elseif ($x.GetType().FullName -eq "System.String") {
        $x = @($x )
    }

    return $x
}

function has-singelValue {
    [CmdletBinding()]
    param (
        # Parameter help description
    
        [string[]]$txt,
        [string]$pattern
    )
    
    if ($pattern.Contains('(?<value>')) {
        $x = $txt | Select-String $pattern | ForEach-Object { $_.Matches[0].Groups['value'].value }
    }
    else {
        $x = $txt | Select-String $pattern 
    }
    if ($null -eq $x) {
        $x = @()
    }
    elseif ($x.GetType().FullName -eq "System.String") {
        $x = @($x )
    }

    if ( $x.length -gt 0) {
        return $true
    }
    return $false;

}
function get-appData {
    [CmdletBinding()]
    param (
        [Parameter()]
        [string]
        $app
    )
    $info = & heroku info --remote $app
    $webUrl = get-singelValue -pattern "^(web url:\s*)(?<value>\S+)$" -inputObject $info
    $hasDatabase = has-singelValue -pattern "(?<value>heroku-postgresql)" -txt $info
    # $webUrl = $info | Select-String "^(web url:\s*)(?<value>\S+)$" | ForEach-Object { $_.Matches[0].Groups['value'].value }
    return  [PSCustomObject]@{
        url         = $webUrl
        hasDatabase = $hasDatabase
    }
  
}

function configure([string]$app, [string]$defaultUser, [string]$defaultPassword) {
    $data = get-appData $app;
 
    $uri = [System.Uri]::new($data.url);
    & heroku config:set URL=$($url) --remote $app
    & heroku config:set HOST=$($uri.Host) --remote $app
    & heroku config:set SESSION_SECRET_KEY=$([System.Convert]::ToBase64String( [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64) )) --remote $app

    if (($null -ne $defaultUser) -and ($null -ne $defaultPassword)) {

        & heroku config:set DEFAULT_USER=$($defaultUser) --remote $app
        & heroku config:set DEFAULT_PASSWORD=$($defaultPassword) --remote $app
    }


    if ($data.hasDatabase -eq $false) {
        & heroku addons:create heroku-postgresql:hobby-dev --remote $app
    }
}


# ensure .env exists
Touch-File  .\.env

$envContent = Get-Content .\.env
if ($null -eq $envContent) {
    $envContent = $()
}
elseif ($envContent.GetType() -eq "System.String") {
    if ($envContent.Length -eq 0) {
        $envContent = $()
    }
    else {
        $envContent = $($envContent)
    }
}


if (-not ( has-singelValue -txt $envContent -pattern "^DATABASE_URL=")) {
    Write-Output "adding local database, you NEED to set user and password"
    Write-Output "DATABASE_URL=postgres://<USER>:<PASSWORD>@localhost:5432/heroku" >> .\.env
}
if (-not (has-singelValue -txt $envContent -pattern "^SSL=")) {
    Write-Output "SSL=false" >> .\.env
}
if (-not (has-singelValue -txt $envContent -pattern "^URL=")) {
    Write-Output "URL=http://localhost:5000/" >> .\.env
}
if (-not (has-singelValue -txt $envContent -pattern "^HOST=")) {
    Write-Output "HOST=localhost" >> .\.env
}
if (-not (has-singelValue -txt $envContent -pattern "^SESSION_SECRET_KEY=")) {
    Write-Output "SESSION_SECRET_KEY=$([System.Convert]::ToBase64String( [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64) ))" >> .\.env
}

if (-not ( has-singelValue -txt $envContent -pattern "^DATABASE_URL=")) {
    Write-Output "adding local database, you NEED to set user and password"
    Write-Output "DATABASE_URL=postgres://<USER>:<PASSWORD>@localhost:5432/heroku" >> .\.env
}
if (-not (has-singelValue -txt $envContent -pattern "^#?DEFAULT_USER=")) {
    Write-Output "#DEFAULT_USER=" >> .\.env
}
if (-not (has-singelValue -txt $envContent -pattern "^#?DEFAULT_PASSWORD=")) {
    Write-Output "#DEFAULT_PASSWORD=" >> .\.env
}

$defaultUser = get-singelValueOrNull -inputObject $envContent -pattern "^DEFAULT_USER=(?<value>.*)$"
$defaultPassword = get-singelValueOrNull -inputObject $envContent -pattern "^DEFAULT_PASSWORD=(?<value>.*)$"

$remotes = & git remote -v

$apps = get-allValue -inputObject $remotes -pattern "^(?<value>\w+)\s+https://git\.heroku.com" | Sort-Object -Unique

foreach ($app in $apps) {
    Write-Host "Set Config for '$app'"
    configure $app $defaultUser $defaultPassword
}
