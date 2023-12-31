"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isZeroAddress = exports.zeroAddress = exports.importPublic = exports.privateToAddress = exports.privateToPublic = exports.publicToAddress = exports.pubToAddress = exports.isValidPublic = exports.isValidPrivate = exports.generateAddress2 = exports.generateAddress = exports.isValidChecksumAddress = exports.toChecksumAddress = exports.isValidAddress = exports.Account = void 0;
const assert_1 = __importDefault(require("assert"));
const bn_js_1 = __importDefault(require("bn.js"));
const rlp = __importStar(require("rlp"));
const secp256k1_1 = require("ethereum-cryptography/secp256k1");
const ethjs_util_1 = require("ethjs-util");
const constants_1 = require("./constants");
const bytes_1 = require("./bytes");
const hash_1 = require("./hash");
const helpers_1 = require("./helpers");
const types_1 = require("./types");
class Account {
    /**
     * This constructor assigns and validates the values.
     * Use the static factory methods to assist in creating an Account from varying data types.
     */
    constructor(nonce = new bn_js_1.default(0), balance = new bn_js_1.default(0), stateRoot = constants_1.KECCAK256_RLP, codeHash = constants_1.KECCAK256_NULL) {
        this.nonce = nonce;
        this.balance = balance;
        this.stateRoot = stateRoot;
        this.codeHash = codeHash;
        this._validate();
    }
    static fromAccountData(accountData) {
        const { nonce, balance, stateRoot, codeHash } = accountData;
        return new Account(nonce ? new bn_js_1.default(bytes_1.toBuffer(nonce)) : undefined, balance ? new bn_js_1.default(bytes_1.toBuffer(balance)) : undefined, stateRoot ? bytes_1.toBuffer(stateRoot) : undefined, codeHash ? bytes_1.toBuffer(codeHash) : undefined);
    }
    static fromRlpSerializedAccount(serialized) {
        const values = rlp.decode(serialized);
        if (!Array.isArray(values)) {
            throw new Error('Invalid serialized account input. Must be array');
        }
        return this.fromValuesArray(values);
    }
    static fromValuesArray(values) {
        const [nonce, balance, stateRoot, codeHash] = values;
        return new Account(new bn_js_1.default(nonce), new bn_js_1.default(balance), stateRoot, codeHash);
    }
    _validate() {
        if (this.nonce.lt(new bn_js_1.default(0))) {
            throw new Error('nonce must be greater than zero');
        }
        if (this.balance.lt(new bn_js_1.default(0))) {
            throw new Error('balance must be greater than zero');
        }
        if (this.stateRoot.length !== 32) {
            throw new Error('stateRoot must have a length of 32');
        }
        if (this.codeHash.length !== 32) {
            throw new Error('codeHash must have a length of 32');
        }
    }
    /**
     * Returns a Buffer Array of the raw Buffers for the account, in order.
     */
    raw() {
        return [
            types_1.bnToUnpaddedBuffer(this.nonce),
            types_1.bnToUnpaddedBuffer(this.balance),
            this.stateRoot,
            this.codeHash,
        ];
    }
    /**
     * Returns the RLP serialization of the account as a `Buffer`.
     */
    serialize() {
        return rlp.encode(this.raw());
    }
    /**
     * Returns a `Boolean` determining if the account is a contract.
     */
    isContract() {
        return !this.codeHash.equals(constants_1.KECCAK256_NULL);
    }
    /**
     * Returns a `Boolean` determining if the account is empty complying to the definition of
     * account emptiness in [EIP-161](https://eips.ethereum.org/EIPS/eip-161):
     * "An account is considered empty when it has no code and zero nonce and zero balance."
     */
    isEmpty() {
        return this.balance.isZero() && this.nonce.isZero() && this.codeHash.equals(constants_1.KECCAK256_NULL);
    }
}
exports.Account = Account;
/**
 * Checks if the address is a valid. Accepts checksummed addresses too.
 */
exports.isValidAddress = function (hexAddress) {
    try {
        helpers_1.assertIsString(hexAddress);
    }
    catch (e) {
        return false;
    }
    return /^0x[0-9a-fA-F]{40}$/.test(hexAddress);
};
/**
 * Returns a checksummed address.
 *
 * If a eip1191ChainId is provided, the chainId will be included in the checksum calculation. This
 * has the effect of checksummed addresses for one chain having invalid checksums for others.
 * For more details see [EIP-1191](https://eips.ethereum.org/EIPS/eip-1191).
 *
 * WARNING: Checksums with and without the chainId will differ. As of 2019-06-26, the most commonly
 * used variation in Ethereum was without the chainId. This may change in the future.
 */
exports.toChecksumAddress = function (hexAddress, eip1191ChainId) {
    helpers_1.assertIsHexString(hexAddress);
    const address = ethjs_util_1.stripHexPrefix(hexAddress).toLowerCase();
    let prefix = '';
    if (eip1191ChainId) {
        const chainId = types_1.toType(eip1191ChainId, types_1.TypeOutput.BN);
        prefix = chainId.toString() + '0x';
    }
    const hash = hash_1.keccakFromString(prefix + address).toString('hex');
    let ret = '0x';
    for (let i = 0; i < address.length; i++) {
        if (parseInt(hash[i], 16) >= 8) {
            ret += address[i].toUpperCase();
        }
        else {
            ret += address[i];
        }
    }
    return ret;
};
/**
 * Checks if the address is a valid checksummed address.
 *
 * See toChecksumAddress' documentation for details about the eip1191ChainId parameter.
 */
exports.isValidChecksumAddress = function (hexAddress, eip1191ChainId) {
    return exports.isValidAddress(hexAddress) && exports.toChecksumAddress(hexAddress, eip1191ChainId) === hexAddress;
};
/**
 * Generates an address of a newly created contract.
 * @param from The address which is creating this new address
 * @param nonce The nonce of the from account
 */
exports.generateAddress = function (from, nonce) {
    helpers_1.assertIsBuffer(from);
    helpers_1.assertIsBuffer(nonce);
    const nonceBN = new bn_js_1.default(nonce);
    if (nonceBN.isZero()) {
        // in RLP we want to encode null in the case of zero nonce
        // read the RLP documentation for an answer if you dare
        return hash_1.rlphash([from, null]).slice(-20);
    }
    // Only take the lower 160bits of the hash
    return hash_1.rlphash([from, Buffer.from(nonceBN.toArray())]).slice(-20);
};
/**
 * Generates an address for a contract created using CREATE2.
 * @param from The address which is creating this new address
 * @param salt A salt
 * @param initCode The init code of the contract being created
 */
exports.generateAddress2 = function (from, salt, initCode) {
    helpers_1.assertIsBuffer(from);
    helpers_1.assertIsBuffer(salt);
    helpers_1.assertIsBuffer(initCode);
    assert_1.default(from.length === 20);
    assert_1.default(salt.length === 32);
    const address = hash_1.keccak256(Buffer.concat([Buffer.from('ff', 'hex'), from, salt, hash_1.keccak256(initCode)]));
    return address.slice(-20);
};
/**
 * Checks if the private key satisfies the rules of the curve secp256k1.
 */
exports.isValidPrivate = function (privateKey) {
    return secp256k1_1.privateKeyVerify(privateKey);
};
/**
 * Checks if the public key satisfies the rules of the curve secp256k1
 * and the requirements of Ethereum.
 * @param publicKey The two points of an uncompressed key, unless sanitize is enabled
 * @param sanitize Accept public keys in other formats
 */
exports.isValidPublic = function (publicKey, sanitize = false) {
    helpers_1.assertIsBuffer(publicKey);
    if (publicKey.length === 64) {
        // Convert to SEC1 for secp256k1
        return secp256k1_1.publicKeyVerify(Buffer.concat([Buffer.from([4]), publicKey]));
    }
    if (!sanitize) {
        return false;
    }
    return secp256k1_1.publicKeyVerify(publicKey);
};
/**
 * Returns the ethereum address of a given public key.
 * Accepts "Ethereum public keys" and SEC1 encoded keys.
 * @param pubKey The two points of an uncompressed key, unless sanitize is enabled
 * @param sanitize Accept public keys in other formats
 */
exports.pubToAddress = function (pubKey, sanitize = false) {
    helpers_1.assertIsBuffer(pubKey);
    if (sanitize && pubKey.length !== 64) {
        pubKey = Buffer.from(secp256k1_1.publicKeyConvert(pubKey, false).slice(1));
    }
    assert_1.default(pubKey.length === 64);
    // Only take the lower 160bits of the hash
    return hash_1.keccak(pubKey).slice(-20);
};
exports.publicToAddress = exports.pubToAddress;
/**
 * Returns the ethereum public key of a given private key.
 * @param privateKey A private key must be 256 bits wide
 */
exports.privateToPublic = function (privateKey) {
    helpers_1.assertIsBuffer(privateKey);
    // skip the type flag and use the X, Y points
    return Buffer.from(secp256k1_1.publicKeyCreate(privateKey, false)).slice(1);
};
/**
 * Returns the ethereum address of a given private key.
 * @param privateKey A private key must be 256 bits wide
 */
exports.privateToAddress = function (privateKey) {
    return exports.publicToAddress(exports.privateToPublic(privateKey));
};
/**
 * Converts a public key to the Ethereum format.
 */
exports.importPublic = function (publicKey) {
    helpers_1.assertIsBuffer(publicKey);
    if (publicKey.length !== 64) {
        publicKey = Buffer.from(secp256k1_1.publicKeyConvert(publicKey, false).slice(1));
    }
    return publicKey;
};
/**
 * Returns the zero address.
 */
exports.zeroAddress = function () {
    const addressLength = 20;
    const addr = bytes_1.zeros(addressLength);
    return bytes_1.bufferToHex(addr);
};
/**
 * Checks if a given address is the zero address.
 */
exports.isZeroAddress = function (hexAddress) {
    try {
        helpers_1.assertIsString(hexAddress);
    }
    catch (e) {
        return false;
    }
    const zeroAddr = exports.zeroAddress();
    return zeroAddr === hexAddress;
};
//# sourceMappingURL=account.js.map