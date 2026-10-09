import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';

export interface GeneratorOptions {
  useTteTags?: boolean;
}

function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function convertHtmlToXmlBreaks(htmlStr: string): string {
  if (!htmlStr) return '';
  const parts = escapeXml(htmlStr).split('\n');
  if (parts.length <= 1) return parts[0];
  return parts.join('</w:t><w:br/><w:t xml:space="preserve">');
}

export function extractBodyContent(xml: string): string {
  const bodyStartIdx = xml.indexOf('<w:body>') + '<w:body>'.length;
  const sectPrIdx = xml.lastIndexOf('<w:sectPr');
  if (sectPrIdx !== -1 && sectPrIdx > bodyStartIdx) {
    return xml.substring(bodyStartIdx, sectPrIdx);
  }
  const bodyEndIdx = xml.lastIndexOf('</w:body>');
  return xml.substring(bodyStartIdx, bodyEndIdx);
}

export function buildSuratIzinKegiatanXml(
  baseXml: string,
  event: any,
  school: any,
  letter: any,
  options?: GeneratorOptions
): string {
  const useTte = options?.useTteTags !== false;
  
  let letterNo = useTte ? '${nomor_naskah}' : '400.14.5.4/.../2026';
  let dateStr = useTte ? '${tanggal_naskah}' : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  let indName = letter.industry?.name || 'Pimpinan Mitra';
  let indAddress = letter.industry?.address || '-';
  let suratIntro = event.letterIntro || 'Sehubungan dengan adanya program sekolah...';
  
  const studentRowsXml = letter.students.map((s: any, i: number) => {
    const start = s.participantStartDate ? new Date(s.participantStartDate).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : (event.startDate ? new Date(event.startDate).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : '');
    const end = s.participantEndDate ? new Date(s.participantEndDate).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : (event.endDate ? new Date(event.endDate).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : '');
    const loc = s.participantLocation || event.location || '';
    const dateRange = `${start} s.d. ${end}`;

    return `
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${i + 1}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml((s.name || '').toUpperCase())}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1340" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(s.nis || '-')}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1300" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(s.className || '-')}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2500" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(dateRange)}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(loc)}</w:t></w:r></w:p></w:tc>
      </w:tr>
    `;
  }).join('');

  const tteSignatureBlock = useTte ? `
    <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>\${jabatan_pengirim}</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
    <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
    <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
    <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>\${ttd_pengirim}</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
    <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
    <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
    <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:b/></w:rPr><w:t>\${nama_pengirim}</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Pembina Utama Muda. IV/c</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>NIP \${nip_pengirim}</w:t></w:r></w:p>
  ` : `
    <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Kepala Sekolah</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
    <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
    <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
    <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
    <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
    <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
    <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:b/></w:rPr><w:t>${escapeXml(school?.headmasterName || 'Joko Pramono, S.Pd., M.Ds')}</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Pembina Utama Muda. IV/c</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>NIP ${escapeXml(school?.headmasterNip || '19690316 199802 1 004')}</w:t></w:r></w:p>
  `;

  const kopSuratXml = useTte ? '' : `
    <!-- KOP SURAT (DENGAN TTE REL) -->
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="120"/></w:pPr>
      <w:r>
        <w:drawing>
          <wp:inline distT="0" distB="0" distL="0" distR="0">
            <wp:extent cx="6693000" cy="1240000"/>
            <wp:effectExtent l="0" t="0" r="0" b="0"/>
            <wp:docPr id="1" name="Picture 1" descr="Kop Surat"/>
            <wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:nvPicPr>
                    <pic:cNvPr id="0" name="Picture 1" descr="Kop Surat"/>
                    <pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="rIdKop">
                      <a:extLst><a:ext uri="{28A0092B-C50C-407E-A947-70E740481C1C}"><a14:useLocalDpi xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" val="0"/></a:ext></a:extLst>
                    </a:blip>
                    <a:srcRect/>
                    <a:stretch><a:fillRect/></a:stretch>
                  </pic:blipFill>
                  <pic:spPr bwMode="auto">
                    <a:xfrm><a:off x="0" y="0"/><a:ext cx="6693000" cy="1240000"/></a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                    <a:noFill/><a:ln><a:noFill/></a:ln>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>
  `;

  const bodyXml = `
${kopSuratXml}
    <!-- NOMOR & TANGGAL -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="10540" w:type="dxa"/>
        <w:jc w:val="left"/>
        <w:tblBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/></w:tblBorders>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="6540"/>
        <w:gridCol w:w="4000"/>
      </w:tblGrid>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="6540" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Nomor : ${escapeXml(letterNo)}</w:t></w:r></w:p>
          <w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Hal.    : </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:i/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Permohonan Izin Kegiatan</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>${escapeXml(school?.city || 'Adiwerna')}, ${escapeXml(dateStr)}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <w:p><w:pPr><w:spacing w:before="120" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Kepada</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Yth.Pimpinan ${escapeXml(indName)}</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:before="0" w:after="160" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>${escapeXml(indAddress)}</w:t></w:r></w:p>

    <w:p><w:pPr><w:spacing w:before="120" w:after="40" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Dengan hormat,</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="both"/><w:spacing w:before="0" w:after="80" w:line="260" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${convertHtmlToXmlBreaks(suratIntro)}</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:before="0" w:after="120" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Adapun identitas siswa yang bersangkutan adalah sebagai berikut:</w:t></w:r></w:p>

    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="10540" w:type="dxa"/>
        <w:jc w:val="left"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/>
          <w:insideH w:val="single" w:sz="6" w:space="0" w:color="000000"/>
          <w:insideV w:val="single" w:sz="6" w:space="0" w:color="000000"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="80" w:type="dxa"/>
          <w:bottom w:w="80" w:type="dxa"/>
          <w:left w:w="120" w:type="dxa"/>
          <w:right w:w="120" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="600"/>
        <w:gridCol w:w="2800"/>
        <w:gridCol w:w="1340"/>
        <w:gridCol w:w="1300"/>
        <w:gridCol w:w="2500"/>
        <w:gridCol w:w="2000"/>
      </w:tblGrid>
      
      <w:tr>
        <w:trPr><w:tblHeader/><w:trHeight w:val="380" w:hRule="atLeast"/></w:trPr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>NO</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>Nama Siswa</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1340" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>NIS</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1300" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>Kelas</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2500" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>Tanggal Pelaksanaan</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>Tempat</w:t></w:r></w:p></w:tc>
      </w:tr>

      ${studentRowsXml}
    </w:tbl>

    <w:p><w:pPr><w:jc w:val="both"/><w:spacing w:before="120" w:after="160" w:line="260" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Kami sampaikan pula bahwa setelah kegiatan ${escapeXml(event.name)} tersebut selesai, siswa yang bersangkutan akan kembali melanjutkan kegiatan PKL di ${escapeXml(indName)} hingga batas waktu yang telah disepakati bersama sebelumnya.</w:t></w:r></w:p>

    <w:p><w:pPr><w:jc w:val="both"/><w:spacing w:before="0" w:after="160" w:line="260" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Demikian permohonan izin ini kami sampaikan. Atas perhatian, pengertian, dan kerja sama yang baik dari Bapak/Ibu pimpinan, kami ucapkan terima kasih.</w:t></w:r></w:p>

    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="10540" w:type="dxa"/>
        <w:jc w:val="left"/>
        <w:tblBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/></w:tblBorders>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="5540"/>
        <w:gridCol w:w="5000"/>
      </w:tblGrid>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="5540" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:p></w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="5000" w:type="dxa"/></w:tcPr>
          ${tteSignatureBlock}
        </w:tc>
      </w:tr>
    </w:tbl>
  `;

  const sectPr = `<w:sectPr><w:pgSz w:w="12240" w:h="18708" w:code="9"/><w:pgMar w:top="567" w:right="850" w:bottom="567" w:left="850" w:header="708" w:footer="708" w:gutter="0"/><w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>`;
  const bodyStartIdx = baseXml.indexOf('<w:body>') + '<w:body>'.length;

  return (
    baseXml.substring(0, bodyStartIdx) +
    bodyXml +
    sectPr +
    '</w:body></w:document>'
  );
}

export async function generateSuratIzinKegiatanDocx(
  event: any,
  school: any,
  letter: any,
  options?: GeneratorOptions
): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), 'template', 'Surat Tugas Monitoring PKL.docx');
  const kopPath = path.join(process.cwd(), 'public', 'images', 'kop-surat-tugas.png');
  
  if (!fs.existsSync(templatePath)) {
    throw new Error('File template tidak ditemukan di: ' + templatePath);
  }
  const zip = new AdmZip(templatePath);

  // Inject kop surat image
  if (fs.existsSync(kopPath)) {
    zip.addFile('word/media/image_kop.png', fs.readFileSync(kopPath));
    let rels = zip.readAsText('word/_rels/document.xml.rels');
    if (!rels.includes('rIdKop')) {
      rels = rels.replace(
        '</Relationships>',
        '<Relationship Id="rIdKop" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image_kop.png"/></Relationships>'
      );
      zip.updateFile('word/_rels/document.xml.rels', Buffer.from(rels, 'utf8'));
    }
  }

  const baseXml = zip.readAsText('word/document.xml');
  const xml = buildSuratIzinKegiatanXml(baseXml, event, school, letter, options);
  zip.updateFile('word/document.xml', Buffer.from(xml, 'utf8'));
  return zip.toBuffer();
}

export async function generateMergedSuratIzinKegiatanDocx(
  event: any,
  school: any,
  letters: any[],
  options?: GeneratorOptions
): Promise<Buffer> {
  if (!letters || letters.length === 0) {
    throw new Error('Tidak ada surat yang dipilih.');
  }
  if (letters.length === 1) {
    return generateSuratIzinKegiatanDocx(event, school, letters[0], options);
  }

  const templatePath = path.join(process.cwd(), 'template', 'Surat Tugas Monitoring PKL.docx');
  const kopPath = path.join(process.cwd(), 'public', 'images', 'kop-surat-tugas.png');
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`File template tidak ditemukan di: ${templatePath}`);
  }
  
  const zip = new AdmZip(templatePath);

  if (fs.existsSync(kopPath)) {
    zip.addFile('word/media/image_kop.png', fs.readFileSync(kopPath));
    let rels = zip.readAsText('word/_rels/document.xml.rels');
    if (!rels.includes('rIdKop')) {
      rels = rels.replace(
        '</Relationships>',
        '<Relationship Id="rIdKop" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image_kop.png"/></Relationships>'
      );
      zip.updateFile('word/_rels/document.xml.rels', Buffer.from(rels, 'utf8'));
    }
  }

  const baseXml = zip.readAsText('word/document.xml');
  const bodyStartIdx = baseXml.indexOf('<w:body>') + '<w:body>'.length;
  const pageBreak = '<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p><w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  const bodyContents: string[] = [];
  
  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i];
    const singleXml = buildSuratIzinKegiatanXml(baseXml, event, school, letter, options);
    bodyContents.push(extractBodyContent(singleXml));
  }

  const sectPr = `<w:sectPr><w:pgSz w:w="12240" w:h="18708" w:code="9"/><w:pgMar w:top="567" w:right="850" w:bottom="567" w:left="850" w:header="708" w:footer="708" w:gutter="0"/><w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>`;
  const mergedXml =
    baseXml.substring(0, bodyStartIdx) +
    bodyContents.join(pageBreak) +
    sectPr +
    '</w:body></w:document>';

  zip.updateFile('word/document.xml', Buffer.from(mergedXml, 'utf8'));
  return zip.toBuffer();
}
