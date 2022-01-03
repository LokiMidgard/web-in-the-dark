


function get-appData([string]$app) {

    $info = & heroku info --remote $app
    $webUrl = $info | Select-String "^(web url:\s*)(?<value>\S+)$" | ForEach-Object { $_.Matches[0].Groups['value'].value }
    return $webUrl
}

function configure([string]$app){
    $url = get-appData($app);
    $uri = [System.Uri]::new($url);
    
    & heroku config:set URL=$($url) --remote $app
    & heroku config:set HOST=$($uri.Host) --remote $app
    & heroku config:set SESSION_SECRET_KEY=$([System.Convert]::ToBase64String( [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64) )) --remote $app

    # & heroku addons:create heroku-postgresql:hobby-dev --remote $app
}

configure('staging')
configure('production')

# Write-Host "$(get-appData('staging'))"
# Write-Host "$(get-appData('production'))"