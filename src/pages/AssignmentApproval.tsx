import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { validateApprovalToken, markTokenAsUsed, getAssignmentByToken } from '../services/approval';

export default function AssignmentApproval() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [assignmentData, setAssignmentData] = useState<{
    id: string;
    user_id: string;
    device_ids: string[];
    assignment_date: string;
    user?: { full_name: string };
  } | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setError('Token de aprovação não fornecido.');
      setLoading(false);
      return;
    }

    validateToken();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const validateToken = async () => {
    try {
      const data = await getAssignmentByToken(token!);
      
      if (!data) {
        setError('Token de aprovação inválido ou expirado.');
        setLoading(false);
        return;
      }

      setAssignmentData(data.assignment);
      setUserEmail(data.userEmail);
      setLoading(false);
    } catch (err) {
      console.error('Error validating token:', err);
      setError('Erro ao validar token de aprovação.');
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      // Validate token again
      const tokenData = await validateApprovalToken(token);
      
      if (!tokenData) {
        setError('Token de aprovação inválido ou expirado.');
        setLoading(false);
        return;
      }

      // Process approval via API
      const approvalResponse = await fetch('/api/process-approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          action: 'approve'
        }),
      });

      if (!approvalResponse.ok) {
        throw new Error('Erro ao processar aprovação');
      }

      setSuccess(true);
      setLoading(false);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      console.error('Error approving assignment:', err);
      setError('Erro ao aprovar vinculação. Por favor, tente novamente.');
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      // Process rejection via API
      const approvalResponse = await fetch('/api/process-approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          action: 'reject'
        }),
      });

      if (!approvalResponse.ok) {
        throw new Error('Erro ao processar rejeição');
      }

      setSuccess(true);
      setLoading(false);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      console.error('Error rejecting assignment:', err);
      setError('Erro ao rejeitar vinculação. Por favor, tente novamente.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2eafa4] mx-auto mb-4"></div>
          <p className="text-gray-600">Processando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erro</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-[#2eafa4] text-white px-4 py-2 rounded-md hover:bg-[#258f86]"
          >
            Voltar para Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sucesso!</h3>
          <p className="text-gray-600 mb-4">
            {'Vinculação processada com sucesso! Você será redirecionado para o login em breve.'}
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2eafa4] mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-[#2eafa4] mb-4">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Aprovação de Vinculação</h2>
          <p className="text-gray-600">Você recebeu uma vinculação de equipamentos. Por favor, revise e confirme.</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalhes da Vinculação</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Funcionário</label>
              <p className="text-gray-900">{assignmentData?.user?.full_name || 'Carregando...'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <p className="text-gray-900">{userEmail}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data da Vinculação</label>
              <p className="text-gray-900">{assignmentData?.assignment_date}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de Equipamentos</label>
              <p className="text-gray-900">{assignmentData?.device_ids?.length || 0}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Equipamentos</label>
            <div className="bg-white rounded-md border border-gray-200 p-4">
              <p className="text-gray-600 text-sm">
                Os equipamentos serão exibidos aqui após a confirmação. 
                Você receberá um email com a lista detalhada após aprovar a vinculação.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Termo de Responsabilidade</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Ao aceitar esta vinculação, você concorda com os termos de responsabilidade 
                  e se compromete a cuidar adequadamente dos equipamentos entregues.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Aceitar Vinculação
          </button>
          <button
            onClick={handleReject}
            disabled={loading}
            className="flex-1 bg-red-600 text-white px-4 py-3 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Rejeitar Vinculação
          </button>
        </div>
      </div>
    </div>
  );
}