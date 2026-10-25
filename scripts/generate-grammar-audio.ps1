# Original placeholder recordings using the installed Windows speech voice.
# Playground itself continues to use the voice chosen in Settings.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$grammarRoot = Split-Path -Parent $PSScriptRoot
$grammarSynth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$grammarSynth.Rate = -1
$grammarWords = @{ 'i' = 'eye'; 'a' = 'a'; 'an' = 'an'; 'the' = 'the'; 'to' = 'to'; 'and' = 'and'; 'not' = 'not' }
try {
    foreach ($grammarEntry in $grammarWords.GetEnumerator()) {
        $grammarPath = Join-Path $grammarRoot ('public/audio/pecs/' + $grammarEntry.Key + '.wav')
        $grammarSynth.SetOutputToWaveFile($grammarPath)
        $grammarSynth.Speak($grammarEntry.Value)
        $grammarSynth.SetOutputToNull()
    }
} finally {
    $grammarSynth.Dispose()
}
Write-Output 'Generated six grammar recordings and the I pronoun recording.'
