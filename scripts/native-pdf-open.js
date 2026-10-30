/* Focused native PDF regression. Runs only in the isolated native-test profile. */
(async () => {
 const check=(ok,message)=>{if(!ok)throw new Error(message)};
 const waitFor=async(fn,name,timeout=30000)=>{const start=Date.now();while(Date.now()-start<timeout){const v=await fn();if(v)return v;await Zotero.Promise.delay(100)}throw new Error('Timeout: '+name)};
 const result={results:[]};
 try {
  check(Zotero.DataDirectory.dir.includes('native-test-'),'profile not isolated');
  await waitFor(()=>Zotero.getMainWindow()?.ZoteroPane?.itemsView,'main view');
  const win=Zotero.getMainWindow(), tabs=win.Zotero_Tabs;
  await Zotero.Libraries.get(Zotero.Libraries.userLibraryID).waitForDataLoad('item');
  await waitFor(()=>Zotero.MindFlow?.itemPaneSectionID,'MindFlow pane');
  const paper=async title=>{const item=new Zotero.Item('journalArticle');item.setField('title',title);await item.saveTx();return item};
  const a=await paper('PDF regression initial item');
  tabs.select('zotero-pane');
  await win.ZoteroPane.collectionsView.selectLibrary(a.libraryID);
  const row=win.ZoteroPane.collectionsView.getRow(win.ZoteroPane.collectionsView.getRowIndexByID('L'+a.libraryID));
  await win.ZoteroPane.itemsView.changeCollectionTreeRows([row]);
  await win.ZoteroPane.itemsView.waitForLoad();
      const pdfPaper = await paper('MindFlow native PDF opening regression');
      const stream = 'BT /F1 12 Tf 30 100 Td (MindFlow PDF opening regression) Tj ET';
      const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream'];
      let pdf = '%PDF-1.4\n', offsets = [0];
      objects.forEach((object, i) => { offsets.push(pdf.length); pdf += (i + 1) + ' 0 obj\n' + object + '\nendobj\n'; });
      const xref = pdf.length;
      pdf += 'xref\n0 6\n0000000000 65535 f \n' + offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('') + 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
      const path = PathUtils.join(Zotero.DataDirectory.dir, 'mindflow-reader-regression.pdf');
      await IOUtils.writeUTF8(path, pdf);
      const attachment = await Zotero.Attachments.importFromFile({ file: path, parentItemID: pdfPaper.id });
      check(attachment.isPDFAttachment(), 'native fixture is not a PDF attachment');
      for (const item of [pdfPaper, attachment]) {
        tabs.select('zotero-pane');
        await win.ZoteroPane.itemsView.selectItems([item.id]);
        const button = await waitFor(async () => {
          const candidate = [...win.document.querySelectorAll('.mf-pane-wrap')].find(n => n.isConnected && n.querySelector('.mf-target-title')?.textContent === pdfPaper.getField('title'))?.querySelector('[data-mindflow-action="pdf"]');
          if (!candidate || candidate.disabled) return null;
          await Zotero.Promise.delay(150);
          return candidate.isConnected && !candidate.disabled ? candidate : null;
        }, 'stable enabled PDF sidebar shortcut');
        button.click();
        let readerTab;
        try {
          readerTab = await waitFor(() => tabs._tabs.find(tab => tab.type === 'reader' && tab.data?.itemID === attachment.id && tabs.selectedID === tab.id), 'native PDF reader selected', 45000);
        } catch (error) {
          throw new Error(String(error) + '; connected=' + button.isConnected + '; disabled=' + button.disabled + '; status=' + [...win.document.querySelectorAll('.mf-action-status')].map(n => n.textContent).join('|'));
        }
        await waitFor(() => !button.disabled, 'PDF open action completed', 45000);
        check(Zotero.Reader.getByTabID(readerTab.id)?.itemID === attachment.id, 'wrong PDF opened');
        check(![...win.document.querySelectorAll('.mf-action-status')].some(n => n.textContent.includes('无法打开 PDF')), 'sidebar reported a PDF failure');
      }
      const readerTab = tabs._tabs.find(tab => tab.type === 'reader' && tab.data?.itemID === attachment.id);
      if (readerTab) tabs.close(readerTab.id);
      tabs.select('zotero-pane');
      await win.ZoteroPane.itemsView.selectItems([a.id]);

 result.results.push({name:'real PDF opens from parent and attachment',pass:true});
 } catch(error){result.results.push({name:'real PDF opens from parent and attachment',pass:false,error:String(error),stack:error.stack});}
 await IOUtils.writeUTF8(PathUtils.join(Zotero.DataDirectory.dir,'native-pdf-results.json'),JSON.stringify(result,null,2));
 Services.startup.quit(Services.startup.eAttemptQuit);
})();
