param([Parameter(Mandatory=$true)][string]$ProjectId)
$ErrorActionPreference = 'Stop'
$cli = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $cli) { throw 'Abrí una PowerShell nueva donde funcione gcloud version.' }
Write-Output ('CLI: ' + $cli.Source)
# Solo consultas. No crea recursos, no habilita APIs y no muestra tokens.
& $cli.Source version
& $cli.Source auth list --filter=status:ACTIVE '--format=table(account,status)'
& $cli.Source projects describe $ProjectId '--format=json(projectId,projectNumber,lifecycleState)' --quiet
& $cli.Source billing projects describe $ProjectId '--format=json(projectId,billingEnabled)' --quiet
& $cli.Source services list --enabled --project=$ProjectId '--format=value(config.name)' --quiet
& $cli.Source compute instances list --project=$ProjectId '--format=table(name,zone.basename(),status,machineType.basename())' --quiet
& $cli.Source dns managed-zones list --project=$ProjectId '--format=table(name,dnsName,visibility)' --quiet
