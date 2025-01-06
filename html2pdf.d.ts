declare module 'html2pdf.js' {
  type MarginTuple = [number, number] | [number, number, number, number];

  export interface Options {
    margin?: number | MarginTuple;
    filename?: string;
    image?: {
      type?: 'jpeg' | 'png' | 'webp';
      quality?: number;
    };
    html2canvas?: {
      scale?: number;
      useCORS?: boolean;
      letterRendering?: boolean;
      [key: string]: any;
    };
    jsPDF?: {
      unit?: 'pt' | 'mm' | 'cm' | 'in';
      format?: 'a0' | 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6' | 'a7' | 'a8' | 'a9' | 'a10' | 'letter' | 'legal';
      orientation?: 'portrait' | 'landscape';
      [key: string]: any;
    };
  }

  export interface Instance {
    set(options: Options): Instance;
    from(element: HTMLElement): Instance;
    save(): Promise<void>;
    output?(type: string, options?: any): any;
  }

  declare function html2pdf(): Instance;
  export default html2pdf;
}
