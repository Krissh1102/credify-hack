import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

enum CameraErrorType { cancelled, unknown }

class CameraResult {
  final File? image;
  final String? error;
  final CameraErrorType? errorType;

  const CameraResult({this.image, this.error, this.errorType});

  bool get success => image != null && error == null;
  bool get wasCancelled => errorType == CameraErrorType.cancelled;
}

class CameraService {
  CameraService._();
  static final CameraService instance = CameraService._();

  final ImagePicker _picker = ImagePicker();

  Future<CameraResult> openCamera() async {
    try {
      final XFile? xFile = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 90,
      );
      if (xFile == null)
        return const CameraResult(
          error: 'Cancelled',
          errorType: CameraErrorType.cancelled,
        );
      return CameraResult(image: File(xFile.path));
    } on Exception catch (e) {
      return CameraResult(
        error: e.toString(),
        errorType: CameraErrorType.unknown,
      );
    }
  }

  Future<CameraResult> pickFromGallery() async {
    try {
      final XFile? xFile = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 90,
      );
      if (xFile == null)
        return const CameraResult(
          error: 'Cancelled',
          errorType: CameraErrorType.cancelled,
        );
      return CameraResult(image: File(xFile.path));
    } on Exception catch (e) {
      return CameraResult(
        error: e.toString(),
        errorType: CameraErrorType.unknown,
      );
    }
  }

  Future<CameraResult> showPickerSheet(BuildContext context) async {
    CameraResult? result;
    await showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => _PickerSheet(
        onCamera: () async {
          Navigator.pop(ctx);
          result = await openCamera();
        },
        onGallery: () async {
          Navigator.pop(ctx);
          result = await pickFromGallery();
        },
        onCancel: () {
          Navigator.pop(ctx);
          result = const CameraResult(
            error: 'Cancelled',
            errorType: CameraErrorType.cancelled,
          );
        },
      ),
    );
    return result ??
        const CameraResult(
          error: 'Cancelled',
          errorType: CameraErrorType.cancelled,
        );
  }
}

class _PickerSheet extends StatelessWidget {
  final VoidCallback onCamera;
  final VoidCallback onGallery;
  final VoidCallback onCancel;
  const _PickerSheet({
    required this.onCamera,
    required this.onGallery,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      margin: EdgeInsets.fromLTRB(
        16,
        0,
        16,
        MediaQuery.of(context).viewInsets.bottom + 32,
      ),
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: cs.outline.withOpacity(0.15)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 12),
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: cs.outline.withOpacity(0.4),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Scan Receipt',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 16,
              color: cs.onSurface,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Choose how to add your receipt',
            style: TextStyle(
              fontSize: 12,
              color: cs.onSurface.withOpacity(0.45),
            ),
          ),
          const SizedBox(height: 14),
          Divider(height: 1, color: cs.outline.withOpacity(0.12)),
          const SizedBox(height: 6),
          _SheetTile(
            icon: Icons.camera_alt_rounded,
            label: 'Take a Photo',
            subtitle: 'Open camera to capture receipt',
            color: cs.primary,
            onTap: onCamera,
          ),
          _SheetTile(
            icon: Icons.photo_library_rounded,
            label: 'Choose from Gallery',
            subtitle: 'Pick an existing receipt image',
            color: Colors.deepPurple,
            onTap: onGallery,
          ),
          const SizedBox(height: 6),
          Divider(height: 1, color: cs.outline.withOpacity(0.12)),
          TextButton(
            onPressed: onCancel,
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              minimumSize: const Size(double.infinity, 0),
            ),
            child: Text(
              'Cancel',
              style: TextStyle(
                color: cs.error,
                fontWeight: FontWeight.w600,
                fontSize: 15,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SheetTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;
  const _SheetTile({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12,
                      color: cs.onSurface.withOpacity(0.48),
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right_rounded,
              color: cs.onSurface.withOpacity(0.28),
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}
