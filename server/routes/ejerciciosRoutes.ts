import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { ejerciciosRepo, resolucionesRepo, academicRepo, votosRepo } from '../repositories';
import { SERVER_CONFIG } from '../config';

const router = Router();

router.get('/ejercicios', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { catedra_id, materia_id, tema, query, orden } = req.query;
    const userId = req.uid || req.user!.uid;
    const isAdmin = SERVER_CONFIG.adminUids.includes(userId);

    let items = await ejerciciosRepo.getAll({
      catedra_id: catedra_id ? String(catedra_id) : undefined,
      materia_id: materia_id ? String(materia_id) : undefined,
      tema: tema ? String(tema) : undefined,
      query: query ? String(query) : undefined,
      currentUserId: userId,
    });

    // Ocultar ejercicios con aprobado === false excepto para administradores o el propio creador
    items = items.filter((e) => {
      if (e.aprobado === false) {
        return isAdmin || e.usuario_id_subio === userId;
      }
      return true;
    });

    const enriched = await Promise.all(
      items.map(async (e) => {
        const res = await resolucionesRepo.getByEjercicioId(e.id);
        const cat = await academicRepo.getCatedraById(e.catedra_id);
        const mat = cat ? await academicRepo.getMateriaById(cat.materia_id) : null;
        const fac = mat ? await academicRepo.getFacultadById(mat.facultad_id) : null;

        const { usuario_id_subio: _omitSubio, ...resto } = e;
        const esMio = e.usuario_id_subio === userId;

        return {
          ...resto,
          usuario_nombre: esMio ? e.usuario_nombre : undefined,
          usuario_foto: esMio ? e.usuario_foto : undefined,
          tiene_resolucion: !!res,
          votos_positivos: res?.votos_positivos || 0,
          votos_negativos: res?.votos_negativos || 0,
          estado_resolucion: res?.estado || 'sin_resolucion',
          catedra_nombre: cat?.nombre || 'Cátedra General',
          catedra_profesor: cat?.profesor || '',
          materia_nombre: mat?.nombre || '',
          facultad_siglas: fac?.siglas || '',
          es_mio: esMio,
        };
      })
    );

    if (orden === 'antiguos') {
      enriched.sort((a, b) => new Date(a.fecha_subida || 0).getTime() - new Date(b.fecha_subida || 0).getTime());
    } else {
      enriched.sort((a, b) => new Date(b.fecha_subida || 0).getTime() - new Date(a.fecha_subida || 0).getTime());
    }

    res.json(enriched);
  } catch (err: any) {
    console.error('Error listing ejercicios:', err);
    res.status(500).json({ error: 'Error al cargar ejercicios' });
  }
});

router.get('/ejercicios/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.uid || req.user!.uid;
    const isAdmin = SERVER_CONFIG.adminUids.includes(userId);
    const ejercicio = await ejerciciosRepo.getById(req.params.id);
    if (!ejercicio) {
      return res.status(404).json({ error: 'Ejercicio no encontrado' });
    }

    if (ejercicio.aprobado === false) {
      const isOwner = ejercicio.usuario_id_subio === userId;
      if (!isAdmin && !isOwner) {
        return res.status(404).json({ error: 'Ejercicio no encontrado' });
      }
    }

    const allResoluciones = await resolucionesRepo.getAllByEjercicioId(ejercicio.id);
    const resolucion =
      allResoluciones.find((r) => r.estado !== 'archivada') ||
      (allResoluciones.length > 0 ? allResoluciones[0] : null);
    const resolucionesArchivadas = allResoluciones.filter((r) => r.id !== resolucion?.id);

    const catedra = await academicRepo.getCatedraById(ejercicio.catedra_id);
    const materia = catedra ? await academicRepo.getMateriaById(catedra.materia_id) : null;
    const facultad = materia ? await academicRepo.getFacultadById(materia.facultad_id) : null;

    const miVoto = resolucion ? await votosRepo.get(resolucion.id, userId) : null;
    const esMio = ejercicio.usuario_id_subio === userId;
    const { usuario_id_subio: _omitSubio, ...ejercicioResto } = ejercicio;

    res.json({
      ...ejercicioResto,
      usuario_nombre: esMio ? ejercicio.usuario_nombre : undefined,
      usuario_foto: esMio ? ejercicio.usuario_foto : undefined,
      es_mio: esMio,
      resolucion,
      resoluciones_archivadas: resolucionesArchivadas,
      catedra,
      materia,
      facultad,
      mi_voto: miVoto ? { tipo: miVoto.tipo, comentario: miVoto.comentario } : undefined,
    });
  } catch (err: any) {
    console.error('Error getting ejercicio detail:', err);
    res.status(500).json({ error: 'Error al cargar detalle del ejercicio' });
  }
});

router.get('/historial', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.uid || req.user!.uid;
    const { materia_id, page = '1' } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = SERVER_CONFIG.historyPageSize;

    const userItems = await ejerciciosRepo.getByUsuario(userId);

    const materiasMap: Record<string, { id: string; nombre: string; cantidad: number }> = {};

    for (const e of userItems) {
      const cat = await academicRepo.getCatedraById(e.catedra_id);
      const mat = cat ? await academicRepo.getMateriaById(cat.materia_id) : null;
      if (mat) {
        if (!materiasMap[mat.id]) {
          materiasMap[mat.id] = { id: mat.id, nombre: mat.nombre, cantidad: 0 };
        }
        materiasMap[mat.id].cantidad++;
      }
    }

    const materiasConHistorial = Object.values(materiasMap);

    let filteredItems = userItems;
    if (materia_id && materia_id !== 'todas') {
      const targetCatedras = await academicRepo.getCatedrasByMateriaId(String(materia_id));
      const targetCatIds = targetCatedras.map((c) => c.id);
      filteredItems = userItems.filter((e) => targetCatIds.includes(e.catedra_id));
    }

    filteredItems.sort(
      (a, b) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime()
    );

    const total = filteredItems.length;
    const totalPaginas = Math.ceil(total / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedSlice = filteredItems.slice(startIndex, startIndex + limitNum);

    const enriched = await Promise.all(
      paginatedSlice.map(async (e) => {
        const res = await resolucionesRepo.getByEjercicioId(e.id);
        const cat = await academicRepo.getCatedraById(e.catedra_id);
        const mat = cat ? await academicRepo.getMateriaById(cat.materia_id) : null;
        const fac = mat ? await academicRepo.getFacultadById(mat.facultad_id) : null;

        const { usuario_id_subio: _omitSubio, ...resto } = e;

        return {
          ...resto,
          es_mio: true,
          tiene_resolucion: !!res,
          votos_positivos: res?.votos_positivos || 0,
          votos_negativos: res?.votos_negativos || 0,
          estado_resolucion: res?.estado || 'sin_resolucion',
          catedra_nombre: cat?.nombre || 'Cátedra General',
          materia_id: mat?.id || '',
          materia_nombre: mat?.nombre || '',
          facultad_siglas: fac?.siglas || '',
        };
      })
    );

    res.json({
      ejercicios: enriched,
      total,
      pagina: pageNum,
      total_paginas: totalPaginas,
      materias_con_historial: materiasConHistorial,
    });
  } catch (err: any) {
    console.error('Error fetching historial:', err);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// Delete exercise (allowed if creator or admin)
router.delete('/ejercicios/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.uid || req.user!.uid;
    const isAdmin = SERVER_CONFIG.adminUids.includes(userId);
    const ejercicioId = req.params.id;

    const ejercicio = await ejerciciosRepo.getById(ejercicioId);
    if (!ejercicio) {
      return res.status(404).json({ error: 'Ejercicio no encontrado' });
    }

    const isOwner = ejercicio.usuario_id_subio === userId;
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Solo el creador o un administrador pueden eliminar este ejercicio.' });
    }

    await ejerciciosRepo.delete(ejercicioId);
    return res.json({ ok: true, mensaje: 'Ejercicio eliminado exitosamente.' });
  } catch (err: any) {
    console.error('Error deleting ejercicio:', err);
    return res.status(500).json({ error: 'Error al eliminar el ejercicio' });
  }
});

export default router;

