import { probeTimeline } from './timeline.js';
import { loadVoicePack, scheduleVoiceEvent } from '../../src/engine/voice-pack-loader.js';
import { measureOnset } from '../../src/engine/onset-detector.js';
const $ = id => document.getElementById(id);
const report = await fetch('/output/music-probe/analysis.json').then(r => r.json());
let context, pack, buffer, loadedFrom, sources = [], raf, timer, generation = 0, exportUrl;
let musicBus, voiceBus;
window.musicProbe = { report, playing: false, evidence: null };
$('metrics').textContent = `曲 ${report.durationSeconds.toFixed(2)}秒 · 推定 ${report.fittedBpm.toFixed(2)} BPM · 曲内 ${report.trackedBeatCount}拍の候補`;
$('status').textContent = '32秒ずつ、前半・中盤・後半を試せます。';
$('play').disabled = $('export').disabled = false;
const options = () => ({ from: Number($('section').value), duration: 32, mode: $('mode').value, phase: Number($('phase').value), offsetMs: Number($('offset').value) });
function invalidateExport() {
  if (exportUrl) URL.revokeObjectURL(exportUrl);
  exportUrl = null; $('download').hidden = true; $('verification').textContent = '';
  window.musicProbe.renderEvidence = null;
}
function stop() {
  generation++;
  for (const node of sources) { try { node.stop(); } catch {} }
  sources = []; cancelAnimationFrame(raf); clearTimeout(timer);
  window.musicProbe.playing = false;
  $('stop').disabled = true; $('play').disabled = false;
  $('count').textContent = '♪';
  document.querySelectorAll('.strip span').forEach(el => el.classList.remove('active'));
}
function buses(audio) {
  const music = audio.createGain(), voice = audio.createGain();
  music.gain.value = Number($('music').value); voice.gain.value = Number($('voice').value);
  music.connect(audio.destination); voice.connect(audio.destination);
  return { music, voice };
}
async function load(audio, from) {
  pack ??= await loadVoicePack(audio, new URL('/public/audio/default-en-female-v1/manifest.json', location.href));
  if (!buffer || loadedFrom !== from) {
    const response = await fetch(`/clip.wav?start=${from}&duration=32`);
    if (!response.ok) throw Error('試聴区間を読み込めませんでした');
    buffer = await audio.decodeAudioData(await response.arrayBuffer()); loadedFrom = from;
  }
}
function schedule(audio, timeline, at, channels, music = true, clicks = $('click').checked) {
  const nodes = [];
  if (music) {
    const source = audio.createBufferSource(); source.buffer = buffer;
    source.connect(channels.music); source.start(at); source.stop(at + timeline.duration); nodes.push(source);
  }
  timeline.events.forEach((event, i) => {
    const next = timeline.events[i + 1];
    const source = scheduleVoiceEvent({ audioContext: audio, destination: channels.words?.get(event.voiceKey) ?? channels.voice,
      voicePack: pack, event, targetTime: at + event.localSeconds,
      endTime: Math.min(at + timeline.duration, next ? at + next.localSeconds : Infinity) });
    if (source) nodes.push(source);
    if (clicks) {
      const osc = audio.createOscillator(), gain = audio.createGain(), t = at + event.localSeconds;
      osc.frequency.value = event.voiceKey === 'one' ? 1320 : 880;
      gain.gain.setValueAtTime(.05, t); gain.gain.exponentialRampToValueAtTime(.0001, t + .03);
      osc.connect(gain).connect(audio.destination); osc.start(t); osc.stop(t + .04); nodes.push(osc);
    }
  });
  return nodes;
}
$('play').onclick = async () => {
  stop(); const token = generation;
  context ??= new AudioContext(); context.resume(); // inside the tap, before awaiting
  $('play').disabled = true; $('stop').disabled = false; $('status').textContent = '音楽を準備しています…';
  try {
    const opts = options(); await load(context, opts.from);
    if (token !== generation) return;
    const timeline = probeTimeline(report, opts), at = context.currentTime + .25;
    const channels = buses(context); musicBus = channels.music; voiceBus = channels.voice;
    sources = schedule(context, timeline, at, channels);
    window.musicProbe.playing = true;
    window.musicProbe.evidence = { ...opts, at, eventCount: timeline.events.length,
      firstEvent: timeline.events[0], lastEvent: timeline.events.at(-1), sourceCount: sources.length,
      decodedSeconds: buffer.duration, sampleRate: buffer.sampleRate };
    $('status').textContent = '再生中 · 小節の位置は仮です';
    const frame = () => {
      const elapsed = context.currentTime - at;
      const trackSeconds = timeline.from + elapsed;
      const tick = timeline.tempo.secondsToTick(trackSeconds);
      const event = timeline.events.findLast(e => e.absoluteTick <= tick);
      $('count').textContent = elapsed >= 0 && event ? event.token : '♪';
      document.querySelectorAll('.strip span').forEach(el => el.classList.toggle('active', el.textContent === $('count').textContent));
      raf = requestAnimationFrame(frame);
    };
    frame(); timer = setTimeout(() => { stop(); $('status').textContent = '試聴が終わりました。'; }, (at-context.currentTime+timeline.duration)*1000);
  } catch (error) { stop(); $('status').textContent = error.message; }
};
$('stop').onclick = () => { stop(); $('status').textContent = '停止しました。'; };
for (const id of ['section','mode','phase','offset','click']) $(id).onchange = () => { stop(); invalidateExport(); $('offsetValue').textContent = `${$('offset').value} ms`; $('status').textContent = '設定を変えました。もう一度再生できます。'; };
for (const id of ['music','voice']) $(id).oninput = () => {
  invalidateExport();
  const bus = id === 'music' ? musicBus : voiceBus;
  bus?.gain.setTargetAtTime(Number($(id).value), context.currentTime, .02);
};
$('export').onclick = async () => {
  stop(); invalidateExport();
  const controls = [...document.querySelectorAll('button,input,select')];
  controls.forEach(el => el.disabled = true);
  $('status').textContent = '試聴WAVと音声タイミングの検算を作っています…';
  try {
    const opts = options(), timeline = probeTimeline(report, opts);
    const offline = new OfflineAudioContext(2, 32*48000, 48000);
    await load(offline, opts.from);
    schedule(offline, timeline, 0, buses(offline));
    const rendered = await offline.startRendering();
    // Separate words onto channels, so a preceding word's tail cannot be
    // mistaken for the onset of the next word in the measurement window.
    const keys = ['one','two','three','four'];
    const voiceOnly = new OfflineAudioContext(keys.length, 32*48000, 48000);
    const merger = voiceOnly.createChannelMerger(keys.length); merger.connect(voiceOnly.destination);
    const channels = buses(voiceOnly);
    channels.words = new Map(keys.map((key,i) => {
      const gain = voiceOnly.createGain(); gain.connect(merger,0,i); return [key,gain];
    }));
    schedule(voiceOnly, timeline, 0, channels, false, false);
    const isolated = await voiceOnly.startRendering();
    const errors = timeline.events.map(event => {
      const speech = isolated.getChannelData(keys.indexOf(event.voiceKey));
      const begin = Math.round((event.localSeconds-.1)*48000);
      const end = Math.round((event.localSeconds+.25)*48000);
      return measureOnset(speech.slice(begin,end),48000).onsetMs - 100;
    });
    let peak=0; for(let c=0;c<rendered.numberOfChannels;c++) for(const v of rendered.getChannelData(c)) peak=Math.max(peak,Math.abs(v));
    window.musicProbe.renderEvidence = { ...opts, measuredVoiceEvents: errors.length,
      onsetErrorMinMs: Math.min(...errors), onsetErrorMaxMs: Math.max(...errors), measurementWindowMs: 5,
      measurementMethod: 'per-word isolated channels, same source scheduler', peak, clipping: peak > 1 };
    $('verification').textContent = `出力音声 ${errors.length}語の発声位置を再測定：誤差 ${Math.min(...errors)}〜${Math.max(...errors)} ms（測定窓5ms。曲の拍の正解を保証する値ではありません）\n出力ピーク ${peak.toFixed(3)} · ${peak>1?'音量を下げて再出力してください':'クリップなし'}`;
    exportUrl=URL.createObjectURL(new Blob([wav(rendered)],{type:'audio/wav'}));
    $('download').href=exportUrl; $('download').download=`paper-umbrella-rumba-${opts.from}s-${opts.mode}.wav`; $('download').hidden=false;
    $('status').textContent='試聴WAVができました。「保存する」で持ち出せます。';
  } catch(error) { $('status').textContent=error.message; }
  finally { controls.forEach(el => el.disabled = false); $('stop').disabled = true; }
};
function wav(audio) {
  const channels=audio.numberOfChannels, size=audio.length*channels*2;
  const data=new ArrayBuffer(44+size), view=new DataView(data);
  const str=(offset,s)=>[...s].forEach((c,i)=>view.setUint8(offset+i,c.charCodeAt(0)));
  str(0,'RIFF');view.setUint32(4,36+size,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);
  view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,audio.sampleRate,true);
  view.setUint32(28,audio.sampleRate*channels*2,true);view.setUint16(32,channels*2,true);view.setUint16(34,16,true);
  str(36,'data');view.setUint32(40,size,true);
  const samples=Array.from({length:channels},(_,c)=>audio.getChannelData(c));
  for(let i=0;i<audio.length;i++) for(let c=0;c<channels;c++) {
    const value=Math.max(-1,Math.min(1,samples[c][i]));view.setInt16(44+(i*channels+c)*2,value<0?value*32768:value*32767,true);
  }
  return data;
}
window.addEventListener('pagehide', stop);
