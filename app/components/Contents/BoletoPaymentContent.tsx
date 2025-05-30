import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import { usePaymentStore } from '~/context/paymentStore'
import { useAccountStore } from '~/context/accountStore'
import { useCreditCardStore } from '~/context/creditCardStore'
import { BilletTypeToString } from '~/utils/map'
import { IMaskInput } from 'react-imask'
import { useToast } from '../Toasts/ToastContext'
import type { ResponseStore } from '~/types/api'
import type { BoletoDetails, DepositBillet } from '~/types/transaction'
import { formatarBoleto, formatToBRL, formatDateBR } from '~/utils/util'
import { LoadingOverlay } from '../Loadings/LoadingOverlay'

interface BoletoPaymentContentProps {
  setShowSuccessModal: (response: ResponseStore) => void;
  setShowErrorToast: (response: ResponseStore) => void;
}

export const BoletoPaymentContent = ({
  setShowErrorToast,
} : BoletoPaymentContentProps) => {
  const [boletoCode, setBoletoCode] = useState<string>('');
  const [boletoInfo, setBoletoInfo] = useState<BoletoDetails | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const { getBillet, loading, depositBillet, billet: billetInfo } = usePaymentStore();
  const { user, updateLocalUser } = useAccountStore();
  const { creditCard } = useCreditCardStore();
  const { openToast } = useToast();

  const validateBoleto = async (code: string) => {
    if (!code || code.length < 44) {
      setShowErrorToast({message: 'Código de boleto inválido. Digite os 44 números.', success: false});
      return;
    }

    var response = await getBillet(code)
    
    if(!response) {
      const error = usePaymentStore.getState().error
      setShowErrorToast({message: error.message, success: false});
      return
    }

    const billet = usePaymentStore.getState().billet

    setBoletoInfo({
      code: formatarBoleto(billet.codeGenerate),
      amount: formatToBRL(billet.amount),
      dueDate: formatDateBR(billet.dateExpiration),
      beneficiary: BilletTypeToString(billet.billetType),
      total: formatToBRL(billet.amount),
      fees: formatToBRL(billet.fee)
    });
  };

  const handlePayBoleto = async () => {
    if (!boletoInfo) {
      setShowErrorToast({message: 'Por favor, valide o boleto antes de confirmar.', success: false});
      return;
    }

    if (boletoInfo.beneficiary.includes('João da Silva') && paymentMethod === 'CREDIT') {
      setShowErrorToast({message: 'Não é possível pagar depósito na própria conta com cartão de crédito.', success: false});
      return;
    }

    const response = await depositBillet({code: billetInfo.codeGenerate, paymentType: paymentMethod} as DepositBillet)
    const state = usePaymentStore.getState()
    openToast({
      type: response ? 'success' : 'error',
      message: response ? state.message : state.error.message,
      position: 'top-right',
      duration: 5000,
    })

    if (response) {
      setBoletoCode('');
      setBoletoInfo(null); // Reseta as informações do boleto
    }

    if(response && paymentMethod == 'DEBIT') {
      console.log('aq')
      updateLocalUser('balance', user.balance - billetInfo.amount);
    }
  };

  return (
    <div id="boleto-content">
      <div className="bg-white dark:bg-slate-950 rounded-xl shadow-md p-6 transition-all duration-300 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Pagamento de Boleto</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="boleto-code">
            Código de barras ou linha digitável
          </label>
          <IMaskInput
            id="boleto-code"
            type="text"
            mask={'0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000'}
            value={boletoCode}
            unmask={true}
            onAccept={(value) => setBoletoCode(value)}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 p-2.5 text-gray-700 dark:text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full py-3 transition-all duration-200"
            placeholder="Digite os 44 números do código de barras"
            aria-label="Código de barras ou linha digitável"
          />
        </div>
        <div className="flex justify-end mb-6">
          <button
            className="px-6 py-2.5 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            disabled={loading}
            onClick={() => validateBoleto(boletoCode)}
            aria-label="Validar boleto"
          >
            {loading ? (
              <>
                <FontAwesomeIcon icon={faCircleNotch} className="fa-spin mr-2" />
                Validando...
              </>
            ) : (
              'Validar Boleto'
            )}
          </button>
        </div>
        {boletoInfo && (
          <div id="boleto-info">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Conta de Energia Elétrica</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{boletoInfo.beneficiary}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Vencimento</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{boletoInfo.dueDate}</p>
                </div>
              </div>
              <div className="barcode mb-4 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Código</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{boletoInfo.code}</p>
                </div>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Valor</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{boletoInfo.amount}</span>
                </div>
                {boletoInfo.fees && (
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Juros/Multa</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{boletoInfo.fees}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Total</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatToBRL(billetInfo.amount + billetInfo.fee)}</span>
                </div>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="payment-method">
                Método de Pagamento
              </label>
              <select
                id="payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'DEBIT' | 'CREDIT')}
                className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full py-3 transition-all duration-200"
                aria-label="Selecionar método de pagamento"
              >
                <option value="account">Conta Corrente • Saldo: {formatToBRL(user.balance)}</option>
                {creditCard && <option value="credit">Cartão de Crédito • Final {creditCard.creditCardNumber.substring(creditCard.creditCardNumber.length - 4)}</option> }
              </select>
            </div>
            <div className="flex justify-end">
              <button
                className="px-6 py-2.5 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                onClick={handlePayBoleto}
                aria-label="Confirmar pagamento"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        )}
      </div>
      <LoadingOverlay isVisible={loading} />
    </div>
  );
};

export default BoletoPaymentContent;