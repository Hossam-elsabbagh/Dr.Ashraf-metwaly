import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  canConvertImage,
  createMediaSection,
  deleteMediaFile,
  deleteMediaSection,
  downloadConvertedImage,
  downloadOriginal,
  formatFileSize,
  getPublicMediaUrl,
  loadMediaWorkspace,
  pickFilesFromBrowser,
  renameMediaSection,
  uploadMediaFile,
  type ImageConversion,
} from '../storage/mediaStorage';
import { COLORS, SHADOWS } from '../theme';
import type {
  ContentTask,
  MediaFile,
  MediaSection,
  MediaWorkspaceType,
} from '../types';
import { AnimatedPressable } from './AnimatedPressable';

interface MediaWorkspaceProps {
  visible: boolean;
  task: ContentTask | null;
  workspace: MediaWorkspaceType;
  onClose: () => void;
}

const WORKSPACE_META: Record<
  MediaWorkspaceType,
  { label: string; eyebrow: string; description: string }
> = {
  material: {
    label: 'Material Link',
    eyebrow: 'SOURCE MATERIAL',
    description: 'Keep original photos, videos, documents and references organized for this task.',
  },
  final: {
    label: 'Final Result',
    eyebrow: 'DELIVERABLES',
    description: 'Store the finished exports and approved final media for this task.',
  },
};

const conversionOptions: { format: ImageConversion; label: string }[] = [
  { format: 'png', label: 'PNG' },
  { format: 'jpeg', label: 'JPG' },
  { format: 'webp', label: 'WEBP' },
];

const confirmDelete = async (title: string, message: string): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return typeof window === 'undefined' ? true : window.confirm(`${title}\n\n${message}`);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
};

export function MediaWorkspace({
  visible,
  task,
  workspace,
  onClose,
}: MediaWorkspaceProps) {
  const meta = WORKSPACE_META[workspace];
  const [sections, setSections] = useState<MediaSection[]>([]);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [sectionNames, setSectionNames] = useState<Record<string, string>>({});
  const [newSectionName, setNewSectionName] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState('');
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    if (!task) return;
    setLoading(true);
    setMessage('');
    try {
      const data = await loadMediaWorkspace(task.id, workspace);
      setSections(data.sections);
      setFiles(data.files);
      setSectionNames(
        Object.fromEntries(data.sections.map((section) => [section.id, section.name])),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load media.');
    } finally {
      setLoading(false);
    }
  }, [task, workspace]);

  useEffect(() => {
    if (visible) void refresh();
  }, [refresh, visible]);

  const filesBySection = useMemo(() => {
    const result = new Map<string, MediaFile[]>();
    sections.forEach((section) => result.set(section.id, []));
    files.forEach((file) => {
      const current = result.get(file.sectionId) ?? [];
      current.push(file);
      result.set(file.sectionId, current);
    });
    return result;
  }, [files, sections]);

  const handleCreateSection = async () => {
    if (!task) return;
    const name = newSectionName.trim() || `Partition ${sections.length + 1}`;
    setBusyKey('new-section');
    setMessage('');
    try {
      const section = await createMediaSection(task.id, workspace, name, sections.length);
      setSections((current) => [...current, section]);
      setSectionNames((current) => ({ ...current, [section.id]: section.name }));
      setNewSectionName('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create partition.');
    } finally {
      setBusyKey('');
    }
  };

  const handleRename = async (section: MediaSection) => {
    const name = (sectionNames[section.id] ?? section.name).trim();
    if (!name || name === section.name) return;
    setBusyKey(`rename:${section.id}`);
    setMessage('');
    try {
      await renameMediaSection(section.id, name);
      setSections((current) =>
        current.map((item) => (item.id === section.id ? { ...item, name } : item)),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not rename partition.');
    } finally {
      setBusyKey('');
    }
  };

  const handleDeleteSection = async (section: MediaSection) => {
    const confirmed = await confirmDelete(
      'Delete partition?',
      `“${section.name}” and all files inside it will be permanently deleted.`,
    );
    if (!confirmed) return;

    setBusyKey(`section:${section.id}`);
    setMessage('');
    try {
      await deleteMediaSection(section, files);
      setSections((current) => current.filter((item) => item.id !== section.id));
      setFiles((current) => current.filter((file) => file.sectionId !== section.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete partition.');
    } finally {
      setBusyKey('');
    }
  };

  const handleUpload = async (section: MediaSection) => {
    if (!task) return;
    setMessage('');
    try {
      const selected = await pickFilesFromBrowser();
      if (selected.length === 0) return;
      setBusyKey(`upload:${section.id}`);

      const uploaded: MediaFile[] = [];
      for (let index = 0; index < selected.length; index += 1) {
        const file = selected[index];
        if (!file) continue;
        setMessage(`Uploading original file ${index + 1} of ${selected.length}…`);
        uploaded.push(await uploadMediaFile(task.id, workspace, section.id, file));
      }
      setFiles((current) => [...current, ...uploaded]);
      setMessage(`${uploaded.length} original file${uploaded.length === 1 ? '' : 's'} uploaded without compression.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not upload media.');
    } finally {
      setBusyKey('');
    }
  };

  const handleDeleteFile = async (file: MediaFile) => {
    const confirmed = await confirmDelete(
      'Delete file?',
      `“${file.originalName}” will be permanently removed from storage.`,
    );
    if (!confirmed) return;

    setBusyKey(`file:${file.id}`);
    setMessage('');
    try {
      await deleteMediaFile(file);
      setFiles((current) => current.filter((item) => item.id !== file.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete file.');
    } finally {
      setBusyKey('');
    }
  };

  const handleDownload = async (file: MediaFile) => {
    setBusyKey(`download:${file.id}`);
    setMessage('');
    try {
      await downloadOriginal(file);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not download file.');
    } finally {
      setBusyKey('');
    }
  };

  const handleConvert = async (file: MediaFile, format: ImageConversion) => {
    setBusyKey(`convert:${file.id}`);
    setMessage('');
    try {
      await downloadConvertedImage(file, format);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not convert image.');
    } finally {
      setBusyKey('');
    }
  };

  if (!task) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <AnimatedPressable onPress={onClose} style={styles.backButton} scaleTo={0.94}>
            <Text style={styles.backButtonText}>‹</Text>
          </AnimatedPressable>
          <View style={styles.topCopy}>
            <Text style={styles.eyebrow}>{meta.eyebrow}</Text>
            <Text style={styles.title}>{meta.label}</Text>
            <Text numberOfLines={1} style={styles.taskTitle}>{task.title}</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={[styles.qualityNotice, SHADOWS.card]}>
            <Text style={styles.qualityTitle}>Original quality preserved</Text>
            <Text style={styles.qualityText}>
              Files are stored as uploaded. No resizing, recompression or automatic image conversion is applied to the original.
            </Text>
          </View>

          <Text style={styles.description}>{meta.description}</Text>

          <View style={[styles.addSectionCard, SHADOWS.card]}>
            <View style={styles.addCircle}><Text style={styles.addCircleText}>+</Text></View>
            <TextInput
              value={newSectionName}
              onChangeText={setNewSectionName}
              onSubmitEditing={() => void handleCreateSection()}
              placeholder="New partition name"
              placeholderTextColor={COLORS.muted}
              style={styles.newSectionInput}
            />
            <AnimatedPressable
              onPress={() => void handleCreateSection()}
              disabled={busyKey === 'new-section'}
              style={styles.addSectionButton}
              scaleTo={0.96}
            >
              <Text style={styles.addSectionButtonText}>
                {busyKey === 'new-section' ? 'Adding…' : 'Add partition'}
              </Text>
            </AnimatedPressable>
          </View>

          {message ? (
            <View style={styles.messageBox}><Text style={styles.messageText}>{message}</Text></View>
          ) : null}

          {loading ? (
            <Text style={styles.loadingText}>Loading media…</Text>
          ) : sections.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No partitions yet</Text>
              <Text style={styles.emptyText}>Use the + area above to create your first partition.</Text>
            </View>
          ) : (
            <View style={styles.sectionList}>
              {sections.map((section) => {
                const sectionFiles = filesBySection.get(section.id) ?? [];
                const sectionBusy = busyKey.endsWith(section.id);
                return (
                  <View key={section.id} style={[styles.sectionCard, SHADOWS.card]}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionNameWrap}>
                        <Text style={styles.sectionLabel}>PARTITION</Text>
                        <TextInput
                          value={sectionNames[section.id] ?? section.name}
                          onChangeText={(value) =>
                            setSectionNames((current) => ({ ...current, [section.id]: value }))
                          }
                          onSubmitEditing={() => void handleRename(section)}
                          style={styles.sectionNameInput}
                        />
                      </View>
                      <View style={styles.sectionActions}>
                        <AnimatedPressable
                          onPress={() => void handleRename(section)}
                          style={styles.softButton}
                          scaleTo={0.95}
                        >
                          <Text style={styles.softButtonText}>Rename</Text>
                        </AnimatedPressable>
                        <AnimatedPressable
                          onPress={() => void handleDeleteSection(section)}
                          disabled={sectionBusy}
                          style={styles.deleteButton}
                          scaleTo={0.95}
                        >
                          <Text style={styles.deleteButtonText}>Delete</Text>
                        </AnimatedPressable>
                      </View>
                    </View>

                    <View style={styles.sectionMetaRow}>
                      <Text style={styles.sectionMeta}>
                        {sectionFiles.length} file{sectionFiles.length === 1 ? '' : 's'}
                      </Text>
                      <AnimatedPressable
                        onPress={() => void handleUpload(section)}
                        disabled={busyKey === `upload:${section.id}`}
                        style={styles.uploadButton}
                        scaleTo={0.96}
                      >
                        <Text style={styles.uploadButtonText}>
                          {busyKey === `upload:${section.id}` ? 'Uploading…' : '+ Upload originals'}
                        </Text>
                      </AnimatedPressable>
                    </View>

                    {sectionFiles.length === 0 ? (
                      <View style={styles.sectionEmpty}>
                        <Text style={styles.sectionEmptyText}>No files uploaded in this partition.</Text>
                      </View>
                    ) : (
                      <View style={styles.fileList}>
                        {sectionFiles.map((file) => (
                          <View key={file.id} style={styles.fileCard}>
                            {file.mimeType.startsWith('image/') ? (
                              <Image
                                source={{ uri: getPublicMediaUrl(file.storagePath) }}
                                resizeMode="cover"
                                style={styles.preview}
                              />
                            ) : (
                              <View style={styles.fileIcon}>
                                <Text style={styles.fileIconText}>FILE</Text>
                              </View>
                            )}

                            <View style={styles.fileInfo}>
                              <Text numberOfLines={2} style={styles.fileName}>{file.originalName}</Text>
                              <Text style={styles.fileMeta}>
                                {formatFileSize(file.sizeBytes)} · {file.mimeType || 'file'}
                              </Text>

                              <View style={styles.fileActions}>
                                <AnimatedPressable
                                  onPress={() => void handleDownload(file)}
                                  style={styles.downloadButton}
                                  scaleTo={0.95}
                                >
                                  <Text style={styles.downloadButtonText}>Download original</Text>
                                </AnimatedPressable>

                                {canConvertImage(file) ? conversionOptions.map((option) => (
                                  <AnimatedPressable
                                    key={option.format}
                                    onPress={() => void handleConvert(file, option.format)}
                                    style={styles.convertButton}
                                    scaleTo={0.95}
                                  >
                                    <Text style={styles.convertButtonText}>{option.label}</Text>
                                  </AnimatedPressable>
                                )) : null}

                                <AnimatedPressable
                                  onPress={() => void handleDeleteFile(file)}
                                  style={styles.fileDeleteButton}
                                  scaleTo={0.95}
                                >
                                  <Text style={styles.fileDeleteButtonText}>Delete</Text>
                                </AnimatedPressable>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    minHeight: 86,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryMist,
  },
  backButtonText: { marginTop: -4, color: COLORS.primaryDark, fontSize: 34, lineHeight: 38 },
  topCopy: { flex: 1 },
  eyebrow: { color: COLORS.goldDark, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  title: { marginTop: 2, color: COLORS.ink, fontSize: 21, fontWeight: '900' },
  taskTitle: { marginTop: 2, color: COLORS.muted, fontSize: 11.5, fontWeight: '600' },
  scrollContent: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 80,
  },
  qualityNotice: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.success,
    backgroundColor: COLORS.successSoft,
  },
  qualityTitle: { color: COLORS.success, fontSize: 13, fontWeight: '900' },
  qualityText: { marginTop: 5, color: COLORS.inkSoft, fontSize: 11, lineHeight: 17, fontWeight: '500' },
  description: { marginTop: 16, color: COLORS.inkSoft, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  addSectionCard: {
    marginTop: 16,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addCircle: { width: 34, height: 34, borderRadius: 12, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  addCircleText: { color: COLORS.primaryDark, fontSize: 23, lineHeight: 25, fontWeight: '500' },
  newSectionInput: {
    minWidth: 140,
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceRaised,
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  addSectionButton: { minHeight: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  addSectionButtonText: { color: COLORS.white, fontSize: 11, fontWeight: '900' },
  messageBox: { marginTop: 12, padding: 11, borderRadius: 13, backgroundColor: COLORS.goldSoft },
  messageText: { color: COLORS.goldDark, fontSize: 10.5, lineHeight: 15, fontWeight: '700' },
  loadingText: { paddingVertical: 32, textAlign: 'center', color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  emptyState: { marginTop: 18, padding: 28, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, alignItems: 'center' },
  emptyTitle: { color: COLORS.ink, fontSize: 15, fontWeight: '900' },
  emptyText: { marginTop: 5, color: COLORS.muted, fontSize: 11, textAlign: 'center' },
  sectionList: { marginTop: 18, gap: 14 },
  sectionCard: { padding: 14, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' },
  sectionNameWrap: { minWidth: 220, flex: 1 },
  sectionLabel: { marginBottom: 5, color: COLORS.muted, fontSize: 8.5, fontWeight: '900', letterSpacing: 1 },
  sectionNameInput: { height: 44, paddingHorizontal: 11, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceRaised, color: COLORS.ink, fontSize: 14, fontWeight: '900' },
  sectionActions: { flexDirection: 'row', gap: 7 },
  softButton: { height: 40, paddingHorizontal: 12, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryMist },
  softButtonText: { color: COLORS.primaryDark, fontSize: 10, fontWeight: '900' },
  deleteButton: { height: 40, paddingHorizontal: 12, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.dangerSoft },
  deleteButtonText: { color: COLORS.danger, fontSize: 10, fontWeight: '900' },
  sectionMetaRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionMeta: { color: COLORS.muted, fontSize: 10, fontWeight: '700' },
  uploadButton: { minHeight: 39, paddingHorizontal: 13, borderRadius: 11, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  uploadButtonText: { color: COLORS.white, fontSize: 10, fontWeight: '900' },
  sectionEmpty: { marginTop: 12, padding: 18, borderRadius: 14, backgroundColor: COLORS.background },
  sectionEmptyText: { color: COLORS.muted, fontSize: 10.5, textAlign: 'center' },
  fileList: { marginTop: 12, gap: 9 },
  fileCard: { padding: 9, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceRaised, flexDirection: 'row', gap: 10 },
  preview: { width: 68, height: 68, borderRadius: 11, backgroundColor: COLORS.backgroundWarm },
  fileIcon: { width: 68, height: 68, borderRadius: 11, backgroundColor: COLORS.goldSoft, alignItems: 'center', justifyContent: 'center' },
  fileIconText: { color: COLORS.goldDark, fontSize: 10, fontWeight: '900' },
  fileInfo: { minWidth: 0, flex: 1, justifyContent: 'center' },
  fileName: { color: COLORS.ink, fontSize: 11.5, lineHeight: 16, fontWeight: '800' },
  fileMeta: { marginTop: 3, color: COLORS.muted, fontSize: 9.5, fontWeight: '600' },
  fileActions: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  downloadButton: { minHeight: 31, paddingHorizontal: 9, borderRadius: 9, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  downloadButtonText: { color: COLORS.white, fontSize: 9, fontWeight: '900' },
  convertButton: { minHeight: 31, paddingHorizontal: 9, borderRadius: 9, borderWidth: 1, borderColor: COLORS.borderStrong, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  convertButtonText: { color: COLORS.inkSoft, fontSize: 9, fontWeight: '900' },
  fileDeleteButton: { minHeight: 31, paddingHorizontal: 9, borderRadius: 9, backgroundColor: COLORS.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  fileDeleteButtonText: { color: COLORS.danger, fontSize: 9, fontWeight: '900' },
});
