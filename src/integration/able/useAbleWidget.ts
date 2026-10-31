import { useEffect,useState } from 'react';
import { readWidgetConfig } from './widgetConfig';
import { ensureAbleWidget } from './widgetLoader';

export function useAbleWidget(){
  const [status,setStatus]=useState<'loading'|'ready'|'error'|'not-configured'>('loading');
  const [error,setError]=useState('');
  const [environment,setEnvironment]=useState('pruebas');
  useEffect(()=>{
    let current=true;
    try {
      const config=readWidgetConfig(import.meta.env);
      if(!config){setStatus('not-configured');return;}
      setEnvironment(config.baseUrl==='https://able-test.ithreexglobal.com' ? 'pruebas' : 'producción');
      ensureAbleWidget(config).then(()=>{if(current)setStatus('ready');},reason=>{if(current){setStatus('error');setError(reason instanceof Error ? reason.message : 'No se pudo cargar Able.');}});
    }catch(reason){setStatus('error');setError(reason instanceof Error ? reason.message : 'Configuración de Able inválida.');}
    return ()=>{current=false;};
  },[]);
  return {status,error,environment};
}
