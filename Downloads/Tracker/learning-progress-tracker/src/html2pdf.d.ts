declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | [number, number] | [number, number, number, number];
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

  interface Html2PdfInstance {
    set: (options: Html2PdfOptions) => Html2PdfInstance;
    from: (element: HTMLElement) => Html2PdfInstance;
    save: () => Promise<void>;
    output?: (type: string, options?: any) => any;
  }

  function html2pdf(): Html2PdfInstance;
  export = html2pdf;
}
