/**
 * https://wavesurfer-js.org/docs/options.html
 * @author Evan Louie <evan.louie@microsoft.com>
 */
declare module "wavesurfer.js" {
  type MultiCanvas = {};
  interface WaveSurferOptions {
    audioRate?: number;
    audioContext?: AudioContext;
    audioScriptProcessor?: ScriptProcessorNode;
    autoCenter?: boolean;
    backend?: "WebAudio" | "MediaElement";
    barGap?: number;
    barHeight?: number;
    barWidth?: number;
    closeAudioContext?: boolean;
    container: string | HTMLElement;
    cursorColor?: string;
    cursorWidth?: number;
    fillParent?: boolean;
    forceDecode?: boolean;
    height?: number;
    hideScrollbar?: boolean;
    interact?: boolean;
    loopSelection?: boolean;
    maxCanvasWidth?: number;
    mediaControls?: boolean;
    mediaType?: string;
    minPxPerSec?: number;
    normalize?: boolean;
    partialRender?: boolean;
    pixelRatio?: boolean;
    plugins?: WaveSurferPlugin[];
    progressColor?: string;
    removeMediaElementOnDestroy?: boolean;
    renderer?: MultiCanvas;
    responsive?: boolean | number;
    scrollParent?: boolean;
    skipLength?: number;
    splitChannels?: boolean;
    waveColor?: string;
    xhr?: {};
  }

  interface WaveSurferEvents {
    audioprocess: () => void;
    destroy: () => void;
    error: (err: string) => void;
    finish: () => void;
    interaction: () => void;
    loading: (percentage: number) => void;
    mute: (status: boolean) => void;
    pause: () => void;
    play: () => void;
    ready: () => void;
    scroll: (ev: {}) => void; //  returns a ScrollEvent
    seek: (progress: number) => void;
    volume: (newVolume: number) => void;
    "waveform-ready": () => void;
    zoom: (minPxPerSec: number) => void;
  }
  /**
   * @see https://wavesurfer-js.org/docs/methods.html
   */
  interface WaveSurferInstance {
    // Undocumented / found myself
    initialisedPluginList: { [key: string]: boolean };

    // https://wavesurfer-js.org/v2/changes.html
    addPlugin(plugin: WaveSurferPlugin): this;
    initPlugin(pluginId: string): void;
    destroyPlugin(name: string): void;

    // https://wavesurfer-js.org/docs/methods.html
    destroy(): void;
    empty(): void;
    getCurrentTime(): number;
    getPlaybackRate(): number;
    getVolume(): number;
    getMute(): boolean;
    getFilters(): any[];
    getReady(): boolean;
    getWaveColor(): string;
    exportPCM(length: number, accuracy: number, noWindow: boolean, start: number): number[]; // docs says "JSON array"
    exportImage(format: string, quality: number): string;
    isPlaying(): boolean;
    load(url: string, peaks?: {}[], preload?: "none" | "metadata" | "auto"): void;
    loadBlob(url: string): void;
    on: <E extends keyof WaveSurferEvents>(event: E, listener: WaveSurferEvents[E]) => void;
    un: <E extends keyof WaveSurferEvents>(event: E, listener: WaveSurferEvents[E]) => void;
    pause(): void;
    play(start?: number, end?: number): void;
    playPause(): void;
    seekAndCenter(progress: number): void;
    seekTo(progress: number): void;
    setHeight(height: number): void;
    setFilters(filters: {}[]): void;
    setPlaybackRate(rate: number): void;
    setVolume(volume: number): void;
    setMute(mute: boolean): void;
    setWaveColor(color: string): void;
    skip(offset: number): void;
    skipBackward(): void;
    skipForward(): void;
    setSinkId(deviceId: string): void;
    stop(): void;
    toggleMute(): void;
    toggleInteraction(): void;
    toggleScroll(): void;
    zoom(pxPerSec: number): void;
  }

  function create(options: WaveSurferOptions): WaveSurferInstance;
}

interface WaveSurferPlugin {}

declare module "wavesurfer.js/dist/plugin/wavesurfer.timeline.js" {
  function create(options?: {
    container?: string | HTMLElement;
    deferInit?: boolean;
  }): WaveSurferPlugin;
}

declare module "wavesurfer.js/dist/plugin/wavesurfer.minimap.js" {
  function create(options?: {
    container?: string | HTMLElement;
    deferInit?: boolean;
  }): WaveSurferPlugin;
}

declare module "wavesurfer.js/dist/plugin/wavesurfer.spectrogram.js" {
  function create(options?: {
    container?: string | HTMLElement;
    deferInit?: boolean;
    labels?: boolean;
  }): WaveSurferPlugin;
}

declare module "wavesurfer.js/dist/plugin/wavesurfer.regions.js" {
  function create(options?: {
    container?: string | HTMLElement;
    deferInit?: boolean;
    dragSelection?: boolean;
    slop?: number;
    regions?: RegionInitializationProps[];
  }): WaveSurferPlugin;

  interface RegionInitializationProps {
    start: number;
    end: number;
    resize?: boolean;
    color?: string;
  }

  interface Region extends RegionInitializationProps {
    id: string | number;
    loop: boolean;
    drag: boolean;
    resize: boolean;
    color: string;
    play(): void;
    playLoop(): void;
    remove(): void;
    onDrag(timeInSeconds: number): void;
    onResize(timeInSeconds: number, start: number): void;
  }

  interface RegionEvents {
    // Generic
    in: () => void;
    out: () => void;
    remove: () => void;
    update: () => void;
    "update-end": () => void;

    // Mouse
    click: (ev: MouseEvent) => void;
    dblclick: (ev: MouseEvent) => void;
    over: (ev: MouseEvent) => void;
    leave: (ev: MouseEvent) => void;
  }

  interface WaveSurferRegionEvents {
    "region-created": (r: Region) => void;
    "region-updated": (r: Region) => void;
    "region-update-end": (r: Region) => void;
    "region-removed": (r: Region) => void;
    "region-play": (r: Region) => void;
    "region-in": (r: Region) => void;
    "region-out": (r: Region) => void;
    "region-mouseenter": (r: Region) => void;
    "region-mouseleave": (r: Region) => void;
    "region-click": (r: Region) => void;
    "region-dblclick": (r: Region) => void;
  }

  /**
   * Methods added to core WaveSurfer instance when regions plugin initialized
   */
  interface WaveSurferRegions {
    addRegion(options: RegionInitializationProps): Region;
    clearRegions(): void;
    enableDragSelection(options?: Region): void;
    regions: { list: { [id: string]: Region } };
    on: <E extends keyof WaveSurferRegionEvents>(
      event: E,
      listener: WaveSurferRegionEvents[E],
    ) => void;
    un: <E extends keyof WaveSurferRegionEvents>(
      event: E,
      listener: WaveSurferRegionEvents[E],
    ) => void;
  }
}
