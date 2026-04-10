param(
  [string]$SourceRoot = "E:\Drone",
  [string]$OutputRoot = ".\assets\photography",
  [int]$DisplayHeight = 720,
  [int]$ThumbHeight = 360,
  [int]$DisplayQuality = 82,
  [int]$ThumbQuality = 72
)

$ErrorActionPreference = "Stop"

python .\scripts\generate_photography.py `
  --source-root $SourceRoot `
  --output-root $OutputRoot `
  --display-height $DisplayHeight `
  --thumb-height $ThumbHeight `
  --display-quality $DisplayQuality `
  --thumb-quality $ThumbQuality
