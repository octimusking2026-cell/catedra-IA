import { Router, Request, Response } from 'express';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { saveReporte, getReportes, getVotosNegativosComentarios, setEjercicioAprobadoStatus } from '../db/reportes';
import { getEjercicioById } from '../db/ejercicios';
import { reporteSchema, visibilidadAdminSchema } from '../middleware/mediaValidation';

const router = Router();

// Submit an exercise report (Open to any logged in user)
router.post('/ejercicios/:id/reportar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const ejercicioId = req.params.id;
    const userId = req.uid!;

    const validation = reporteSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Datos inválidos',
        mensaje: validation.error.issues[0]?.message || 'Motivo de reporte requerido.',
      });
    }

    const { motivo, detalle } = validation.data;

    const ejercicio = await getEjercicioById(ejercicioId);
    if (!ejercicio) {
      return res.status(404).json({ error: 'Ejercicio no encontrado' });
    }

    const reporte = await saveReporte({
      ejercicio_id: ejercicioId,
      usuario_id: userId,
      usuario_nombre: req.user?.name || req.user?.email || 'Estudiante',
      motivo,
      detalle,
    });

    return res.json({ ok: true, mensaje: 'Reporte registrado correctamente.', reporte });
  } catch (err: any) {
    console.error('Error al registrar reporte:', err);
    return res.status(500).json({ error: 'Error interno al registrar el reporte' });
  }
});

// Admin Panel: Get all reports and negative votes with comments (Restricted to admins)
router.get('/admin/reportes', authMiddleware, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [reportes, votosNegativos] = await Promise.all([
      getReportes(),
      getVotosNegativosComentarios(),
    ]);

    res.json({
      reportes,
      votosNegativos,
    });
  } catch (err: any) {
    console.error('Error al obtener datos admin:', err);
    res.status(500).json({ error: 'Error interno al cargar panel admin' });
  }
});

// Admin Panel: Toggle exercise approval/visibility status (Restricted to admins)
router.patch('/admin/ejercicios/:id/visibilidad', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const ejercicioId = req.params.id;

    const validation = visibilidadAdminSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Datos inválidos',
        mensaje: validation.error.issues[0]?.message || 'El campo aprobado debe ser un booleano.',
      });
    }

    const { aprobado } = validation.data;

    await setEjercicioAprobadoStatus(ejercicioId, aprobado);
    return res.json({ ok: true, ejercicioId, aprobado, mensaje: aprobado ? 'Ejercicio visible' : 'Ejercicio ocultado' });
  } catch (err: any) {
    console.error('Error al cambiar visibilidad:', err);
    return res.status(500).json({ error: 'Error interno al actualizar visibilidad' });
  }
});

// --- Academic Catalog Admin Management ---

// Create Facultad
router.post('/admin/facultades', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { academicRepo } = await import('../repositories');
    const { id, nombre, universidad, siglas, logo_color } = req.body;
    if (!nombre || !universidad || !siglas) {
      return res.status(400).json({ error: 'Nombre, universidad y siglas son requeridos.' });
    }
    const facultadId = id && id.trim() ? id.trim() : `fac_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nueva = await academicRepo.createFacultad({
      id: facultadId,
      nombre: nombre.trim(),
      universidad: universidad.trim(),
      siglas: siglas.trim(),
      logo_color: logo_color || '#15803d',
    });
    res.json({ ok: true, facultad: nueva });
  } catch (err: any) {
    console.error('Error creando facultad:', err);
    res.status(500).json({ error: 'Error interno al crear facultad' });
  }
});

// Update Facultad
router.put('/admin/facultades/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { academicRepo } = await import('../repositories');
    const updated = await academicRepo.updateFacultad(req.params.id, req.body);
    res.json({ ok: true, facultad: updated });
  } catch (err: any) {
    console.error('Error actualizando facultad:', err);
    res.status(500).json({ error: 'Error interno al actualizar facultad' });
  }
});

// Delete Facultad
router.delete('/admin/facultades/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { academicRepo } = await import('../repositories');
    await academicRepo.deleteFacultad(req.params.id);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Error eliminando facultad:', err);
    res.status(500).json({ error: 'Error interno al eliminar facultad' });
  }
});

// Create Materia
router.post('/admin/materias', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { academicRepo } = await import('../repositories');
    const { id, nombre, facultad_id, codigo, anio, cuatrimestre, carreras_ids } = req.body;
    if (!nombre || !facultad_id) {
      return res.status(400).json({ error: 'Nombre y facultad son requeridos.' });
    }
    const materiaId = id && id.trim() ? id.trim() : `mat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nueva = await academicRepo.createMateria({
      id: materiaId,
      nombre: nombre.trim(),
      facultad_id: facultad_id.trim(),
      codigo: codigo ? codigo.trim() : undefined,
      anio: anio ? Number(anio) : 1,
      cuatrimestre: cuatrimestre || '1',
      carreras_ids: Array.isArray(carreras_ids) ? carreras_ids : [],
    });
    res.json({ ok: true, materia: nueva });
  } catch (err: any) {
    console.error('Error creando materia:', err);
    res.status(500).json({ error: 'Error interno al crear materia' });
  }
});

// Update Materia
router.put('/admin/materias/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { academicRepo } = await import('../repositories');
    const updated = await academicRepo.updateMateria(req.params.id, req.body);
    res.json({ ok: true, materia: updated });
  } catch (err: any) {
    console.error('Error actualizando materia:', err);
    res.status(500).json({ error: 'Error interno al actualizar materia' });
  }
});

// Delete Materia
router.delete('/admin/materias/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { academicRepo } = await import('../repositories');
    await academicRepo.deleteMateria(req.params.id);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Error eliminando materia:', err);
    res.status(500).json({ error: 'Error interno al eliminar materia' });
  }
});

// Create Catedra
router.post('/admin/catedras', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { academicRepo } = await import('../repositories');
    const { id, materia_id, nombre, cuatrimestre, estilo_metodologico, temas, criterios_clave, consejos_examen } = req.body;
    if (!nombre || !materia_id) {
      return res.status(400).json({ error: 'Nombre de cátedra y materia son requeridos.' });
    }
    const catedraId = id && id.trim() ? id.trim() : `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nueva = await academicRepo.createCatedra({
      id: catedraId,
      materia_id: materia_id.trim(),
      nombre: nombre.trim(),
      cuatrimestre: cuatrimestre || '1° Cuatrimestre',
      estilo_metodologico: estilo_metodologico || 'Criterio metodológico estándar de la cátedra.',
      temas: Array.isArray(temas) && temas.length > 0 ? temas : ['General'],
      criterios_clave: Array.isArray(criterios_clave) ? criterios_clave : [],
      consejos_examen: Array.isArray(consejos_examen) ? consejos_examen : [],
    });
    res.json({ ok: true, catedra: nueva });
  } catch (err: any) {
    console.error('Error creando cátedra:', err);
    res.status(500).json({ error: 'Error interno al crear cátedra' });
  }
});

// Update Catedra
router.put('/admin/catedras/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { academicRepo } = await import('../repositories');
    const updated = await academicRepo.updateCatedra(req.params.id, req.body);
    res.json({ ok: true, catedra: updated });
  } catch (err: any) {
    console.error('Error actualizando cátedra:', err);
    res.status(500).json({ error: 'Error interno al actualizar cátedra' });
  }
});

// Delete Catedra
router.delete('/admin/catedras/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { academicRepo } = await import('../repositories');
    await academicRepo.deleteCatedra(req.params.id);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Error eliminando cátedra:', err);
    res.status(500).json({ error: 'Error interno al eliminar cátedra' });
  }
});

export default router;
