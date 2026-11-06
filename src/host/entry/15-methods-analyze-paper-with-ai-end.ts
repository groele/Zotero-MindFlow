              basis, source: matchedEntry ? source : 'none',
              sourceId: matchedEntry?.id || '', requestedSource: declaredSource,
              sourceRecovery,
              requestedSourceId: requestedId, verification,
              quote: matchedEntry ? quote : '', attemptedQuote: !matchedEntry ? quote : '',
              evidenceContext,
              pageLabel: ['annotation', 'comment'].includes(source) && matchedEntry ? matchedEntry.page || '' : '',
              link: matchedEntry?.uri || itemData.zoteroUri };
          });
      }
      if (sectionKeys.every((key) => sections[key].length === 0)) {
        throw new Error('模型没有提取到可用的研究条目。请检查 PDF 文字范围或更换模型。');
      }
      const result = {
        title: itemData.title, zoteroUri: itemData.zoteroUri, libraryID: item.libraryID,
        sourceScope: { pdfState, pdfTruncated, readingMode: prepared.readingMode, sectionStatus: prepared.sectionStatus, hasAbstract: Boolean(abstract),
          abstractSource: abstract ? prepared.abstractSource : 'none',
          noteCount: usedNoteCount, annotationCount: usedAnnotationCount, analysisMode: mode,
          quickSampled: mode === 'quick' && pdfText.length > 18000,
          standardMode: mode === 'standard',
          deepCondensed,
          model: config.model, modelEntryId: config.entryId, reasoningLevel,
          templateId: template.id, templateVersion: template.version,
          customPrompt,
          synthesisCandidateLimit: story ? 24 : 5,
          llmIntegration: { service: 'llm-for-zotero', api: 'agent.runTurn', completedCalls: llmRuns.length,
            runIds: llmRuns.map((run) => run.runId).filter(Boolean) },
          endpointHost: config.host, selectedSources,
          sourceWarnings: prepared.sourceWarnings },
        sections,
      };
      if (!prepared.results) prepared.results = {};
      prepared.results[scopeKey] = JSON.parse(JSON.stringify(result));
      return result;
      } finally {
        options.signal?.removeEventListener('abort', cancel);
        this._aiCancellers.delete(cancel);
      }
    },

    saveMindMapToItem(data = {}, targetWindow = null) {
      let snapshot;
      try { snapshot = JSON.parse(JSON.stringify(data)); }
      catch (error) { return Promise.resolve({ success: false, message: '导图数据无法序列化；未归档：' + error }); }
      // Archive and delete must share the same mutation boundary. Otherwise a
      // queued archive can create a new attachment after a completed deletion.
      const operation = (this._workspaceWriteQueue || Promise.resolve()).catch(() => {})
        .then(() => this._saveMindMapToItem(snapshot, targetWindow));
      this._archiveWriteQueue = operation.catch(() => {});
      this._workspaceWriteQueue = this._archiveWriteQueue;
      return operation;
    },

